import React, {useEffect, useState} from 'react';
import './App.css';
import Web3 from "web3";
import {AdNetwork} from "./types/web3-v1-contracts/AdNetwork";
import adNetworkAbi from "./contracts/AdNetwork.json";
import getWeb3 from "./getWeb3";
import {
  AppBar,
  Box,
  Button,
  Container,
  makeStyles,
  Theme,
  Toolbar,
  Typography,
  useTheme
} from "@material-ui/core";
import {BrowserRouter, Link, Route, Routes} from "react-router-dom";
import {TopPage} from "./pages/TopPage";
import {LoginPage} from "./pages/LoginPage";
import {AdManageApiClient} from "./clients/AdManageApiClient";
import axios from "axios";
import {AdNetworkContractClient} from "./clients/AdNetworkContractClient";
import {AdManagePage} from "./pages/AdManagePage";
import {AdCreatePage} from "./pages/AdCreatePage";
import {InventoriesPage} from "./pages/InventoriesPage";
import {InventoryCreatePage} from "./pages/InventoryCreatePage";
import {InventoryManagePage} from "./pages/InventoryManagePage";

export type AppState = {
  web3: Web3;
  networkId: number,
  accounts: string[];
  contract: AdNetworkContractClient;
  adManageApi: AdManageApiClient;
  user?: EthUser;
}

export type EthUser = {
  account: string;
}

const useStyle = makeStyles({
  root: (props: Theme) => ({
    paddingTop: props.spacing(10),
    paddingLeft: props.spacing(5),
    paddingRight: props.spacing(5),
  })
});

export interface RouteDefinition {
  path: string;
  element: JSX.Element;
  title: string;
  displayAppBar: boolean;
  needLogin: boolean;
}

export const routes: RouteDefinition[] = [
  {
    path: "/",
    element: <TopPage/>,
    title: "Top Page",
    displayAppBar: false,
    needLogin: false,
  },
  {
    path: "/login",
    element: <LoginPage/>,
    title: "Login",
    displayAppBar: false,
    needLogin: false,
  },
  {
    path: "/ads",
    element: <AdManagePage/>,
    title: "Ad Manage",
    displayAppBar: true,
    needLogin: true,
  },
  {
    path: "/ads/create",
    element: <AdCreatePage/>,
    title: "Ad Create",
    displayAppBar: false,
    needLogin: true,
  },
  {
    path: "/inventories/discovery",
    element: <InventoriesPage/>,
    title: "Discovery Inventories",
    displayAppBar: true,
    needLogin: true,
  },
  {
    path: "/inventories/create",
    element: <InventoryCreatePage/>,
    title: "Inventory Create",
    displayAppBar: false,
    needLogin: true,
  },
  {
    path: "/inventories",
    element: <InventoryManagePage/>,
    title: "Inventory Manage",
    displayAppBar: true,
    needLogin: true,
  },
];

export type AppStateContext = {
  state: AppState,
  setState: React.Dispatch<React.SetStateAction<AppState | undefined>>
}

export const AppStateCtx = React.createContext<AppStateContext | undefined>(undefined);

const App = (): JSX.Element => {
  const classes = useStyle(useTheme());
  const [state, setState] = useState<AppState>();

  useEffect(() => {
    const init = async () => {
      try {
        const web3 = await getWeb3();

        const accounts = await web3.eth.getAccounts();

        const networkId = await web3.eth.net.getId();
        // const deployedNetwork = adNetworkAbi.networks[networkId];
        const instance = new AdNetworkContractClient((new web3.eth.Contract(
            adNetworkAbi.abi as any,
            // deployedNetwork && deployedNetwork.address,
            "0xefbd1daD62548302fE597179199dB90826D5c1ab"
        ) as any) as AdNetwork);

        const axiosInstance = axios.create({
          baseURL: 'http://localhost:8080',
          withCredentials: true,
          xsrfCookieName: 'XSRF-TOKEN',
          xsrfHeaderName: 'X-XSRF-TOKEN'
        });

        const adManageApi = new AdManageApiClient(axiosInstance);
        const loginUser = await adManageApi.loginCheck();

        setState((state) => ({
          web3: web3,
          networkId: networkId,
          accounts: accounts,
          contract: instance,
          adManageApi: adManageApi,
          user: loginUser.address ? {
            account: loginUser.address
          } : undefined,
        }));
      } catch (error) {
        alert(
            `App.ts: Failed to load web3, accounts, or contract.
          Check console for details.`,
        );
        console.error(error);
      }
    }
    init();

    return () => {
    };
  }, []);

  if (!state) {
    return <div>Loading... Web3, accounts, and contract...</div>
  }

  return (
      <AppStateCtx.Provider value={{state, setState}}>
        <BrowserRouter>
          <AppBar position="static">
            <Container maxWidth="xl">
              <Toolbar disableGutters>
                <Typography
                    variant="h6"
                    noWrap
                    component="div"
                >
                  Blockchain AdNetwork
                </Typography>
                <Box>
                  {routes
                      .filter(route => route.displayAppBar)
                      .filter(route => (state.user && route.needLogin) || !route.needLogin)
                      .map((route) => (
                          <Button
                              key={route.path}
                              component={Link}
                              to={route.path}
                          >
                            <Typography color="textSecondary">
                              {route.title}
                            </Typography>
                          </Button>
                      ))}
                </Box>
              </Toolbar>
            </Container>
          </AppBar>
          <div className={classes.root}>
            <Typography variant="h2" gutterBottom={true}>
              Blockchain AdNetwork
            </Typography>
            <Typography variant="body1" gutterBottom={true}>
              Trade inventory through DApps without an intermediary.
            </Typography>
            <div>
              <Routes>
                {routes.map(route => (
                    <Route key={route.path} {...(route as {
                      path: string;
                      element: JSX.Element;
                    })}/>
                ))}
              </Routes>
            </div>
          </div>
        </BrowserRouter>
      </AppStateCtx.Provider>
  );
}

export default App;
