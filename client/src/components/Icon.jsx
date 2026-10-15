export default function Icon({ name, className }) {
  return (
    <svg className={className}>
      <use href={`/img/icons.svg#icon-${name}`} />
    </svg>
  );
}
