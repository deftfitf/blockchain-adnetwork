import React, {useContext, useEffect, useState} from "react";
import {AppStateCtx} from "../App";
import {Ad, Inventory} from "../clients/AdNetworkContractModels";
import {Link, useParams} from "react-router-dom";
import {
  Button,
  Card,
  CardActions,
  CardContent,
  Container,
  Grid,
  Typography
} from "@material-ui/core";
import moment from "moment";

export const InventoryDetailPage = (): JSX.Element => {
  const ctx = useContext(AppStateCtx);
  if (!ctx || !ctx.state.user) {
    return <p>Please Login</p>;
  }
  const _inventoryId = useParams<{ inventoryId: string }>().inventoryId;
  if (!_inventoryId) {
    return <React.Fragment/>;
  }
  const inventoryId = Number.parseInt(_inventoryId);

  const [inventory, setInventory] = useState<Inventory>();
  const state = ctx.state;
  const user = ctx.state.user;
  const [ads, setAds] = useState<Ad[]>([]);
  const [transactionHash, setTransactionHash] = useState<string>();

  useEffect(() => {
    const init = async () => {
      const inventory = await state.contract.getInventory(inventoryId);
      if (inventory) {
        setInventory(inventory);
        setAds(await state.contract.getAdsOf(inventoryId));
      }
    };
    init();

    return () => {
    };
  }, [inventoryId]);

  if (!inventory) {
    return <React.Fragment/>;
  }

  const isAdExpired = (ad: Ad): boolean => {
    // If this ad is expired over the delivery term, it can be collected by ad or inventory owner either.
    return moment().unix() > ad.end;
  };

  const onApprove = async (inventoryId: number, adId: number) => {
    setTransactionHash(await state.contract.approveAd(user.account, inventoryId, adId));
  };

  const onReject = async (inventoryId: number, adId: number) => {
    setTransactionHash(await state.contract.rejectAd(user.account, inventoryId, adId));
  };

  const onCollect = async (inventoryId: number, adId: number) => {
    setTransactionHash(await state.contract.collectAd(user.account, inventoryId, adId));
  }

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
          </Card>

          <Typography variant="h4" gutterBottom={true}>
            List of ads set in the inventory
          </Typography>
          <Container maxWidth="md">
            <Grid container spacing={4}>
              {ads.map((ad) => (
                  <Grid item key={ad.adId} xs={12} sm={6} md={4}>
                    <Card>
                      <CardContent>
                        <Typography gutterBottom variant="h5" component="h2">
                          Ad ID: {ad.adId} ({ad.approved ? "Approved" : "Waiting for Approval"})
                        </Typography>
                        <Typography>
                          Inventory ID: {ad.inventoryId}
                        </Typography>
                        <Typography>
                          Delivery
                          Duration: {moment(ad.start * 1000).format()} ~ {moment(ad.end * 1000).format()}
                        </Typography>
                        <Typography>
                          Ad Hash: {ad.adHash}
                        </Typography>
                        <Typography>
                          Ad Hash For Delivery: {ad.adHashForDelivery}
                        </Typography>
                      </CardContent>
                      <CardActions>
                        {!ad.approved && <Button
                            size="small" variant="contained" color="primary"
                            onClick={() => onApprove(ad.inventoryId, ad.adId)}>
                          Approve
                        </Button>}
                        {!ad.approved && <Button
                            size="small" variant="contained" color="secondary"
                            onClick={() => onReject(ad.inventoryId, ad.adId)}>
                          Reject
                        </Button>}
                        {isAdExpired(ad) &&
                            <Button size="small" variant="outlined"
                                    onClick={() => onCollect(ad.inventoryId, ad.adId)}>
                              Collect
                            </Button>}
                      </CardActions>
                    </Card>
                  </Grid>
              ))}
            </Grid>
          </Container>

          {transactionHash && <div>
            <Typography>
              Submitted Transaction: {transactionHash}
            </Typography>
          </div>}
        </div>
      </React.Fragment>
  );

}