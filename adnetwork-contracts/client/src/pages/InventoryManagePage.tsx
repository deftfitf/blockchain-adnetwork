/// TODO Inventory Manager Page作成. 承認 / 回収 の設定..

import React, {useContext, useEffect, useState} from "react"
import {AppStateCtx} from "../App";
import {Inventory} from "../clients/AdNetworkContractModels";
import {
  Button,
  Card,
  CardActions,
  CardContent,
  Container,
  Grid,
  Typography
} from "@material-ui/core";
import {Link} from "react-router-dom";

export const InventoryManagePage = (): JSX.Element => {
  const ctx = useContext(AppStateCtx);
  if (!ctx || !ctx.state.user) {
    return <p>Please Login</p>;
  }
  const state = ctx.state;
  const user = ctx.state.user;
  const [inventories, setInventories] = useState<Inventory[]>([]);

  useEffect(() => {
    const init = async () => {
      setInventories(await state.contract.getInventoriesByOwnerAddress(user.account));
    };
    init();

    return () => {
    };
  }, []);

  return (
      <React.Fragment>
        <Typography variant="h4" gutterBottom={true}>
          Your Inventories
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

          <Button
              variant="contained"
              color="primary"
              component={Link}
              to="/inventories/create"
          >
            Create new inventory
          </Button>

          <Typography variant="h4" gutterBottom={true}>
            Your own Inventories
          </Typography>
          <Container maxWidth="md">
            <Grid container spacing={4}>
              {inventories.map((inventory) => (
                  <Grid item key={inventory.inventoryId} xs={12} sm={6} md={4}>
                    <Card>
                      <CardContent>
                        <Typography gutterBottom variant="h5" component="h2">
                          Inventory ID: {inventory.inventoryId}
                        </Typography>
                        <Typography>NAME: {inventory.inventoryName}</Typography>
                        <Typography>URL: {inventory.inventoryUrl}</Typography>
                        <Typography>Public Key: {inventory.publicKey}</Typography>
                        <Typography>Owner Address: {inventory.ownerAddress}</Typography>
                        <Typography>Floor Price: {inventory.floorPrice}</Typography>

                      </CardContent>
                      <CardActions>
                        <Button size="small" component={Link} color="primary"
                                to={`/inventories/${inventory.inventoryId}`}>
                          Detail
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
              ))}
            </Grid>
          </Container>
        </div>
      </React.Fragment>
  );
}