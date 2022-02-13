import React, {useContext} from "react";
import {AppStateCtx} from "../App";
import {Link, Typography} from "@material-ui/core";

export const TopPage = (): JSX.Element => {
  const ctx = useContext(AppStateCtx);
  if (!ctx || !ctx.state) {
    return <React.Fragment/>;
  }
  const state = ctx.state;

  return (
      <React.Fragment>
        <Typography variant="h4" gutterBottom={true}>
          Your connection information
        </Typography>
        <div>
          <table>
            <tbody>
            <tr>
              <td>Accounts</td>
              <td>{state.accounts}</td>
            </tr>
            <tr>
              <td>Network</td>
              <td>{state.networkId}</td>
            </tr>
            </tbody>
          </table>

          <Typography gutterBottom={true}>
            <Link href="/login">
              Go to the login page
            </Link>
          </Typography>
        </div>
      </React.Fragment>
  );
};
