import React, {useContext} from "react";
import {AppStateCtx} from "../App";
import {Button, Typography} from "@material-ui/core";
import {login} from "../functions/LoginFunctions";

export const LoginPage = (): JSX.Element => {
  const ctx = useContext(AppStateCtx);
  if (!ctx || !ctx.state) {
    return <React.Fragment/>;
  }
  const state = ctx.state;

  const onLogin: () => void = async () => {
    const ethUser = await login(state.web3, state.adManageApi, state.accounts[0]);
    console.log(ethUser);
    ctx.setState({
      ...state,
      user: ethUser,
    });
  }

  const onLogout: () => void = async () => {
    await state.adManageApi.logout();
    ctx.setState({
      ...state,
      user: undefined,
    });
  }

  return (
      <React.Fragment>
        <Typography variant="h4" gutterBottom={true}>
          Login with your eth address
        </Typography>
        <div>
          <Typography variant="body1" gutterBottom={true}>
            {!ctx.state.user && <Button
                variant="contained"
                color="primary"
                onClick={onLogin}
            >Login</Button>}
            {ctx.state.user && <Button
                variant="contained"
                color="secondary"
                onClick={onLogout}
            >Logout</Button>}
          </Typography>
        </div>
      </React.Fragment>
  );
};

