import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api, { errorMessage } from '../../api';
import { AdminPage, LoadState } from '../../components/AdminUI.jsx';
import { useAlert } from '../../context/AlertContext.jsx';

const emptyForm = {
  name: '',
  summary: '',
  description: '',
  duration: '',
  maxGroupSize: '',
  difficulty: 'easy',
  price: '',
  priceDiscount: '',
  startDates: [''],
  startLocation: { description: '', address: '', lng: '', lat: '' },
  locations: [],
  guides: []
};

const dateInput = d => (d ? new Date(d).toISOString().slice(0, 10) : '');

function Field({ label, hint, children }) {
  return (
    <div className="form__group">
      <label className="form__label">{label}</label>
      {children}
      {hint && <span className="admin-muted admin-hint">{hint}</span>}
    </div>
  );
}

export default function AdminTourForm() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const { showAlert } = useAlert();

  const [form, setForm] = useState(emptyForm);
  const [staff, setStaff] = useState([]);
  const [existing, setExisting] = useState({ cover: '', images: [] });
  const [cover, setCover] = useState(null);
  const [gallery, setGallery] = useState([]);
  const [loading, setLoading] = useState(editing);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const coverPreview = useMemo(() => (cover ? URL.createObjectURL(cover) : null), [cover]);
  const galleryPreview = useMemo(() => gallery.map(f => URL.createObjectURL(f)), [gallery]);

  // Guides to choose from (anyone with a guide role)
  useEffect(() => {
    api
      .get('/admin/users')
      .then(res => setStaff(res.data.data.data.filter(u => ['guide', 'lead-guide'].includes(u.role))))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!editing) return;
    api
      .get(`/tours/${id}`)
      .then(res => {
        const t = res.data.data.data;
        setForm({
          name: t.name,
          summary: t.summary,
          description: t.description || '',
          duration: t.duration,
          maxGroupSize: t.maxGroupSize,
          difficulty: t.difficulty,
          price: t.price,
          priceDiscount: t.priceDiscount ?? '',
          startDates: t.startDates?.length ? t.startDates.map(dateInput) : [''],
          startLocation: {
            description: t.startLocation?.description || '',
            address: t.startLocation?.address || '',
            lng: t.startLocation?.coordinates?.[0] ?? '',
            lat: t.startLocation?.coordinates?.[1] ?? ''
          },
          locations: (t.locations || []).map(l => ({
            day: l.day ?? '',
            description: l.description || '',
            lng: l.coordinates?.[0] ?? '',
            lat: l.coordinates?.[1] ?? ''
          })),
          guides: (t.guides || []).map(g => g.id || g._id)
        });
        setExisting({ cover: t.imageCover, images: t.images || [] });
      })
      .catch(err => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [id, editing]);

  const set = (key, value) => setForm(f => ({ ...f, [key]: value }));
  const setLoc = (key, value) => setForm(f => ({ ...f, startLocation: { ...f.startLocation, [key]: value } }));
  const setStop = (i, key, value) =>
    setForm(f => ({ ...f, locations: f.locations.map((s, n) => (n === i ? { ...s, [key]: value } : s)) }));

  const toggleGuide = gid =>
    setForm(f => ({
      ...f,
      guides: f.guides.includes(gid) ? f.guides.filter(g => g !== gid) : [...f.guides, gid]
    }));

  const submit = async e => {
    e.preventDefault();
    if (!editing && !cover) return showAlert('error', 'Please choose a cover image.');

    const sl = form.startLocation;
    const data = {
      name: form.name.trim(),
      summary: form.summary.trim(),
      description: form.description,
      duration: Number(form.duration),
      maxGroupSize: Number(form.maxGroupSize),
      difficulty: form.difficulty,
      price: Number(form.price),
      priceDiscount: form.priceDiscount === '' ? null : Number(form.priceDiscount),
      startDates: form.startDates.filter(Boolean),
      guides: form.guides
    };
    if (sl.lat !== '' && sl.lng !== '') {
      data.startLocation = {
        description: sl.description,
        address: sl.address,
        coordinates: [Number(sl.lng), Number(sl.lat)]
      };
    }
    data.locations = form.locations
      .filter(s => s.lat !== '' && s.lng !== '')
      .map(s => ({
        day: Number(s.day) || undefined,
        description: s.description,
        coordinates: [Number(s.lng), Number(s.lat)]
      }));

    const body = new FormData();
    body.append('data', JSON.stringify(data));
    if (cover) body.append('imageCover', cover);
    gallery.forEach(f => body.append('images', f));

    setSaving(true);
    try {
      if (editing) await api.patch(`/tours/${id}`, body);
      else await api.post('/tours', body);
      showAlert('success', editing ? 'Tour updated!' : 'Tour created!');
      navigate('/admin/tours');
    } catch (err) {
      showAlert('error', errorMessage(err));
      setSaving(false);
    }
  };

  const title = editing ? 'Edit tour' : 'New tour';

  if (loading || error)
    return (
      <AdminPage title={title}>
        <LoadState loading={loading} error={error} />
      </AdminPage>
    );

  return (
    <AdminPage
      title={title}
      subtitle={editing ? form.name : 'Fill in the details customers will see.'}
      actions={<Link to="/admin/tours" className="btn btn--small btn--ghost">← Back to tours</Link>}
    >
      <form className="form tour-form" onSubmit={submit}>
        <section className="admin-card">
          <h3 className="admin-card__title">Basics</h3>
          <Field label="Tour name" hint="10 to 40 characters. Used in the tour's web address.">
            <input className="form__input" required minLength={10} maxLength={40} value={form.name} onChange={e => set('name', e.target.value)} />
          </Field>
          <Field label="Short summary" hint="One or two lines shown on the tour card.">
            <input className="form__input" required value={form.summary} onChange={e => set('summary', e.target.value)} />
          </Field>
          <Field label="Full description" hint="Separate paragraphs with a blank line.">
            <textarea className="form__input" rows={6} value={form.description} onChange={e => set('description', e.target.value)} />
          </Field>
        </section>

        <section className="admin-card">
          <h3 className="admin-card__title">Pricing & details</h3>
          <div className="form-grid">
            <Field label="Price per person (₹)">
              <input className="form__input" type="number" min="0" required value={form.price} onChange={e => set('price', e.target.value)} />
            </Field>
            <Field label="Discount price (₹)" hint="Optional. Must be below the price.">
              <input className="form__input" type="number" min="0" value={form.priceDiscount} onChange={e => set('priceDiscount', e.target.value)} />
            </Field>
            <Field label="Duration (days)">
              <input className="form__input" type="number" min="1" required value={form.duration} onChange={e => set('duration', e.target.value)} />
            </Field>
            <Field label="Max group size">
              <input className="form__input" type="number" min="1" required value={form.maxGroupSize} onChange={e => set('maxGroupSize', e.target.value)} />
            </Field>
            <Field label="Difficulty">
              <select className="form__input" value={form.difficulty} onChange={e => set('difficulty', e.target.value)}>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="difficult">Difficult</option>
              </select>
            </Field>
          </div>

          <Field label="Start dates">
            {form.startDates.map((d, i) => (
              <div className="inline-row" key={i}>
                <input className="form__input" type="date" value={d} onChange={e => set('startDates', form.startDates.map((x, n) => (n === i ? e.target.value : x)))} />
                {form.startDates.length > 1 && (
                  <button type="button" className="btn btn--small btn--ghost" onClick={() => set('startDates', form.startDates.filter((_, n) => n !== i))}>Remove</button>
                )}
              </div>
            ))}
            <button type="button" className="btn btn--small btn--ghost" onClick={() => set('startDates', [...form.startDates, ''])}>+ Add date</button>
          </Field>
        </section>

        <section className="admin-card">
          <h3 className="admin-card__title">Images</h3>
          <Field label="Cover image" hint={editing ? 'Leave empty to keep the current cover.' : 'Required. Wide photos (3:2) look best.'}>
            <div className="image-pick">
              {(coverPreview || existing.cover) && (
                <img src={coverPreview || `/img/tours/${existing.cover}`} alt="Cover" />
              )}
              <input type="file" accept="image/*" onChange={e => setCover(e.target.files[0] || null)} />
            </div>
          </Field>
          <Field label="Gallery images (up to 3)" hint={editing ? 'Choosing new images replaces the current gallery.' : 'Optional.'}>
            <div className="image-pick">
              {(galleryPreview.length ? galleryPreview : existing.images.map(i => `/img/tours/${i}`)).map(src => (
                <img key={src} src={src} alt="" />
              ))}
              <input type="file" accept="image/*" multiple onChange={e => setGallery([...e.target.files].slice(0, 3))} />
            </div>
          </Field>
        </section>

        <section className="admin-card">
          <h3 className="admin-card__title">Start point</h3>
          <p className="admin-muted admin-hint">
            Tip: in Google Maps, right-click a place and click the numbers at the top to copy its latitude and longitude.
          </p>
          <div className="form-grid">
            <Field label="Place name">
              <input className="form__input" value={form.startLocation.description} onChange={e => setLoc('description', e.target.value)} placeholder="e.g. Manali, Himachal Pradesh" />
            </Field>
            <Field label="Address">
              <input className="form__input" value={form.startLocation.address} onChange={e => setLoc('address', e.target.value)} />
            </Field>
            <Field label="Latitude">
              <input className="form__input" type="number" step="any" min="-90" max="90" value={form.startLocation.lat} onChange={e => setLoc('lat', e.target.value)} />
            </Field>
            <Field label="Longitude">
              <input className="form__input" type="number" step="any" min="-180" max="180" value={form.startLocation.lng} onChange={e => setLoc('lng', e.target.value)} />
            </Field>
          </div>
        </section>

        <section className="admin-card">
          <h3 className="admin-card__title">Stops on the map</h3>
          {form.locations.map((s, i) => (
            <div className="stop-row" key={i}>
              <input className="form__input" type="number" min="1" placeholder="Day" value={s.day} onChange={e => setStop(i, 'day', e.target.value)} />
              <input className="form__input" placeholder="Place" value={s.description} onChange={e => setStop(i, 'description', e.target.value)} />
              <input className="form__input" type="number" step="any" placeholder="Latitude" value={s.lat} onChange={e => setStop(i, 'lat', e.target.value)} />
              <input className="form__input" type="number" step="any" placeholder="Longitude" value={s.lng} onChange={e => setStop(i, 'lng', e.target.value)} />
              <button type="button" className="btn btn--small btn--ghost btn--danger" onClick={() => set('locations', form.locations.filter((_, n) => n !== i))}>Remove</button>
            </div>
          ))}
          <button
            type="button"
            className="btn btn--small btn--ghost"
            onClick={() => set('locations', [...form.locations, { day: form.locations.length + 1, description: '', lat: '', lng: '' }])}
          >
            + Add stop
          </button>
        </section>

        <section className="admin-card">
          <h3 className="admin-card__title">Guides</h3>
          {staff.length === 0 && (
            <p className="admin-muted">
              No guides yet. Give a user the "guide" or "lead-guide" role in <Link to="/admin/users" className="admin-link">Manage users</Link>.
            </p>
          )}
          <div className="check-grid">
            {staff.map(g => (
              <label key={g.id} className="check">
                <input type="checkbox" checked={form.guides.includes(g.id)} onChange={() => toggleGuide(g.id)} />
                <img src={`/img/users/${g.photo}`} alt="" />
                <span>{g.name} <span className="admin-muted">({g.role})</span></span>
              </label>
            ))}
          </div>
        </section>

        <div className="form-actions">
          <Link to="/admin/tours" className="btn btn--ghost">Cancel</Link>
          <button className="btn btn--green" disabled={saving}>
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Create tour'}
          </button>
        </div>
      </form>
    </AdminPage>
  );
}
