const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');

const MAX_MESSAGES = 12;
const MAX_MESSAGE_LENGTH = 2000;
const MAX_CONVERSATION_LENGTH = 10000;

exports.reply = catchAsync(async (req, res, next) => {
  const { messages } = req.body;
  if (
    !Array.isArray(messages) ||
    messages.length === 0 ||
    messages.length > MAX_MESSAGES
  ) {
    return next(new AppError('Send a valid chat message to continue.', 400));
  }

  let conversationLength = 0;
  for (const [index, message] of messages.entries()) {
    if (
      !message ||
      !['user', 'model'].includes(message.role) ||
      typeof message.text !== 'string' ||
      !message.text.trim() ||
      message.text.length > MAX_MESSAGE_LENGTH
    ) {
      return next(
        new AppError('Chat messages must be text and under 2,000 characters.', 400)
      );
    }
    if (message.role !== (index % 2 === 0 ? 'user' : 'model')) {
      return next(
        new AppError('Chat messages must alternate between user and assistant.', 400)
      );
    }
    conversationLength += message.text.length;
  }

  if (
    conversationLength > MAX_CONVERSATION_LENGTH ||
    messages[messages.length - 1].role !== 'user'
  ) {
    return next(new AppError('The chat conversation is too long or incomplete.', 400));
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return next(
      new AppError('The chatbot is not configured yet. Add GEMINI_API_KEY on the server.', 503)
    );
  }

  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  let response;
  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        model
      )}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        signal: AbortSignal.timeout(30000),
        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text: 'You are YatraHub travel support. Help visitors discover and plan tours in India and explain how to use the website. Be friendly, concise, and practical. Do not claim to see live availability, make bookings, access accounts, or know prices unless the user provides that information. Direct users to the relevant site page for account or booking actions.'
              }
            ]
          },
          contents: messages.map(({ role, text }) => ({
            role,
            parts: [{ text }]
          })),
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 700
          }
        })
      }
    );
  } catch {
    return next(
      new AppError('Could not reach the chatbot service. Please try again shortly.', 502)
    );
  }

  if (!response.ok) {
    let providerError;
    try {
      providerError = await response.json();
    } catch {
      providerError = null;
    }

    if (response.status === 429) {
      return next(
        new AppError(
          'Gemini quota is currently unavailable. Check your Google AI Studio usage and try again later.',
          503
        )
      );
    }
    if (response.status === 400) {
      console.error(
        'Gemini rejected the chat request:',
        providerError?.error?.status || response.status
      );
      return next(
        new AppError(
          'Gemini rejected the request. Check that GEMINI_MODEL is a supported model name.',
          502
        )
      );
    }
    if ([401, 403].includes(response.status)) {
      console.error(
        'Gemini chatbot credentials were rejected:',
        providerError?.error?.status || response.status
      );
      return next(
        new AppError(
          'Gemini rejected the API key. Check GEMINI_API_KEY and ensure the Generative Language API is enabled.',
          503
        )
      );
    }
    if (response.status === 404) {
      console.error('Gemini chatbot model was not found:', {
        model,
        providerStatus: providerError?.error?.status || response.status,
        providerMessage: providerError?.error?.message || 'No provider details returned.'
      });
      return next(
        new AppError(
          `Gemini could not find the configured model "${model}". Verify the model is available to this API key and restart the server after changing GEMINI_MODEL.`,
          503
        )
      );
    }
    console.error(
      `Gemini chatbot request failed with status ${
        providerError?.error?.status || response.status
      }.`
    );
    return next(
      new AppError(
        'Gemini is temporarily unavailable. Please try again shortly.',
        502
      )
    );
  }

  let result;
  try {
    result = await response.json();
  } catch {
    return next(new AppError('The chatbot returned an invalid response.', 502));
  }

  const candidate = result.candidates?.[0];
  const reply = candidate?.content?.parts
    ?.map(part => part.text || '')
    .join('')
    .trim();
  if (!reply) {
    if (
      result.promptFeedback?.blockReason === 'SAFETY' ||
      candidate?.finishReason === 'SAFETY'
    ) {
      return next(
        new AppError(
          'Gemini blocked that message with its safety filters. Please rephrase it and try again.',
          400
        )
      );
    }
    return next(
      new AppError('The chatbot could not answer that message. Please try rephrasing it.', 502)
    );
  }

  res.status(200).json({ status: 'success', data: { reply } });
});
