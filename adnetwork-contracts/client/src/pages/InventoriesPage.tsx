import React, {useContext, useEffect, useState} from "react";
import {AppStateCtx} from "../App";
import {Inventory} from "../clients/AdNetworkContractModels";
import {Link, useLocation} from "react-router-dom";
import {
  Button,
  Card,
  CardActions,
  CardContent,
  Container,
  Grid,
  Typography
} from "@material-ui/core";

export const InventoriesPage = (): JSX.Element => {
  const ctx = useContext(AppStateCtx);
  if (!ctx || !ctx.state.user) {
    return <p>Please Login</p>;
  }
  const state = ctx.state;
  const user = ctx.state.user;
  const query = new URLSearchParams(useLocation().search);
  const offsetStr = query.get("offset");
  const limitStr = query.get("limit");
  const [range, setRange] = useState<[number, number]>([
    offsetStr ? Number.parseInt(offsetStr) : 0,
    limitStr ? Math.min(Number.parseInt(limitStr), 50) : 30,
  ]);
  const [inventories, setInventories] = useState<Inventory[]>([]);

  const updateInventory = async () => {
    const [offset, limit] = range;
    const inventories = await ctx.state.contract.getInventories(offset, limit);
    setInventories(inventories);
  };

  const onBeforePage = () => {
    setRange(oldRange => {
      const [offset, limit] = oldRange;
      updateInventory();
      return [Math.max(0, offset - limit), limit];
    })
  };

  const onNextPage = () => {
    setRange(oldRange => {
      const [offset, limit] = oldRange;
      updateInventory();
      return [offset + limit, limit];
    });
  };

  useEffect(() => {
    updateInventory();

    return () => {
    };
  }, [range]);

  return (
      <React.Fragment>
        <Typography variant="h4" gutterBottom={true}>
          Inventory Discovery
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
            Inventories [{range[0]} - {range[0] + range[1]}]
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
                        <Button size="small">View</Button>
                        <Button size="small">Edit</Button>
                      </CardActions>
                    </Card>
                  </Grid>
              ))}
            </Grid>
          </Container>
          <Button variant="contained" onClick={onBeforePage}>
            Before Page
          </Button>
          <Button variant="contained" onClick={onNextPage}>
            Next Page
          </Button>
        </div>
      </React.Fragment>
  );

}