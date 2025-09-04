import * as React from "react";
import { SvgIcon } from "./svg-icon";

export const createSvgIcon = (path, displayName, viewBox) => {
  function Component(props) {
    return (
      <SvgIcon data-testid={`${displayName}Icon`} viewBox={viewBox} {...props}>
        {path}
      </SvgIcon>
    );
  }

  return React.memo(Component);
};
