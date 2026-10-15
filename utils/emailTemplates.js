// Email templates written in React (rendered to static HTML on the server).
// Replaces the old Pug templates: baseEmail / welcome / passwordReset.
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const style = require('./emailStyle');

const h = React.createElement;
const tableProps = {
  role: 'presentation',
  border: 0,
  cellPadding: 0,
  cellSpacing: 0
};

const Button = ({ url, children }) =>
  h(
    'table',
    { ...tableProps, className: 'btn btn-primary' },
    h(
      'tbody',
      null,
      h(
        'tr',
        null,
        h(
          'td',
          { align: 'left' },
          h(
            'table',
            tableProps,
            h(
              'tbody',
              null,
              h(
                'tr',
                null,
                h('td', null, h('a', { href: url, target: '_blank' }, children))
              )
            )
          )
        )
      )
    )
  );

const BaseEmail = ({ subject, children }) =>
  h(
    'html',
    null,
    h(
      'head',
      null,
      h('meta', { name: 'viewport', content: 'width=device-width' }),
      h('meta', {
        httpEquiv: 'Content-Type',
        content: 'text/html; charset=UTF-8'
      }),
      h('title', null, subject),
      h('style', { dangerouslySetInnerHTML: { __html: style } })
    ),
    h(
      'body',
      null,
      h(
        'table',
        { ...tableProps, className: 'body' },
        h(
          'tbody',
          null,
          h(
            'tr',
            null,
            h('td'),
            h(
              'td',
              { className: 'container' },
              h(
                'div',
                { className: 'content' },
                h(
                  'table',
                  { role: 'presentation', className: 'main' },
                  h(
                    'tbody',
                    null,
                    h(
                      'tr',
                      null,
                      h(
                        'td',
                        { className: 'wrapper' },
                        h(
                          'table',
                          tableProps,
                          h(
                            'tbody',
                            null,
                            h('tr', null, h('td', null, children))
                          )
                        )
                      )
                    )
                  )
                ),
                h(
                  'div',
                  { className: 'footer' },
                  h(
                    'table',
                    tableProps,
                    h(
                      'tbody',
                      null,
                      h(
                        'tr',
                        null,
                        h(
                          'td',
                          { className: 'content-block' },
                          h(
                            'span',
                            { className: 'apple-link' },
                            'YatraHub Travel Pvt. Ltd., 12 MG Road, Bengaluru, Karnataka 560001, India'
                          ),
                          h('br'),
                          " Don't like these emails? ",
                          h('a', { href: '#' }, 'Unsubscribe')
                        )
                      )
                    )
                  )
                )
              )
            )
          )
        )
      )
    )
  );

const Welcome = ({ firstName, url }) =>
  h(
    React.Fragment,
    null,
    h('p', null, `Hi ${firstName},`),
    h('p', null, "Namaste and welcome to YatraHub, we're glad to have you 🎉🙏"),
    h(
      'p',
      null,
      "We're all a big family here, so make sure to upload your user photo so we get to know you a bit better!"
    ),
    h(Button, { url }, 'Upload user photo'),
    h(
      'p',
      null,
      "If you need any help with booking your next tour, please don't hesitate to contact me!"
    ),
    h('p', null, '- The YatraHub Team')
  );

const PasswordReset = ({ firstName, url }) =>
  h(
    React.Fragment,
    null,
    h('p', null, `Hi ${firstName},`),
    h(
      'p',
      null,
      'Forgot your password? Click the button below to choose a new one. The link is valid for 10 minutes.'
    ),
    h(Button, { url }, 'Reset your password'),
    h('p', null, "If you didn't forget your password, please ignore this email!")
  );

const Row = ({ label, value }) =>
  h(
    'tr',
    null,
    h('td', { style: { padding: '6px 12px 6px 0', color: '#6b7c74' } }, label),
    h('td', { style: { padding: '6px 0', fontWeight: 600 } }, value)
  );

const BookingConfirmation = ({ firstName, url, data }) =>
  h(
    React.Fragment,
    null,
    h('p', null, `Hi ${firstName},`),
    h(
      'p',
      null,
      `Your payment was successful and your booking for ${data.tourName} is confirmed. 🎉 Here are your details:`
    ),
    h(
      'table',
      { ...tableProps, style: { margin: '12px 0 20px' } },
      h(
        'tbody',
        null,
        h(Row, { label: 'Tour', value: data.tourName }),
        h(Row, { label: 'Duration', value: `${data.duration} days` }),
        h(Row, { label: 'Starts from', value: data.startLocation }),
        h(Row, { label: 'Next date', value: data.startDate }),
        h(Row, { label: 'Difficulty', value: data.difficulty }),
        h(Row, { label: 'Amount paid', value: data.amount }),
        h(Row, { label: 'Payment ID', value: data.paymentId }),
        h(Row, { label: 'Order ID', value: data.orderId }),
        h(Row, { label: 'Paid on', value: data.paidOn })
      )
    ),
    h(Button, { url }, 'View my bookings'),
    h(
      'p',
      null,
      'Keep this email as your receipt. Questions? Just reply to this email and our team will help.'
    ),
    h('p', null, 'Happy travels!'),
    h('p', null, '- The YatraHub Team')
  );

const templates = {
  welcome: Welcome,
  passwordReset: PasswordReset,
  bookingConfirmation: BookingConfirmation
};

module.exports = (template, { firstName, url, subject, data }) => {
  const Body = templates[template];
  if (!Body) throw new Error(`Unknown email template: ${template}`);
  return (
    '<!doctype html>' +
    renderToStaticMarkup(
      h(BaseEmail, { subject }, h(Body, { firstName, url, data }))
    )
  );
};
