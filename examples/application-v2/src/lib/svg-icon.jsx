const getViewBox = (width, height) => `0 0 ${width} ${height || width}`;

export const SvgIcon = ({ children, viewBox, width, height, className }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      role="img"
      style={{
        display: "inline-block",
        width,
        height,
      }}
      className={className}
      viewBox={viewBox || getViewBox(width, height)}
      fill="none"
    >
      {children}
    </svg>
  );
};
