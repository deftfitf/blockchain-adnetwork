import React, {useContext, useEffect, useState} from "react";
import {AppStateCtx} from "../App";
import {
  Button,
  Card,
  CardActions,
  CardContent,
  Container,
  Grid,
  Typography
} from "@material-ui/core";
import {Ad} from "../clients/AdNetworkContractModels";
import {Link} from "react-router-dom";
import moment from "moment";

export const AdManagePage = (): JSX.Element => {
  const ctx = useContext(AppStateCtx);
  if (!ctx || !ctx.state.user) {
    return <p>Please Login</p>;
  }
  const state = ctx.state;
  const user = ctx.state.user;
  const [ads, setAds] = useState<Ad[]>([]);

  useEffect(() => {
    const init = async () => {
      setAds(await state.contract.getAdsByOwnerAddress(user.account));
    };
    init();

    return () => {
    };
  }, []);
  const [transactionHash, setTransactionHash] = useState<string>();

  const isAdExpired = (ad: Ad): boolean => {
    // If this ad is expired over the delivery term, it can be collected by ad or inventory owner either.
    return moment().unix() > ad.end;
  };

  const onCollect = async (inventoryId: number, adId: number) => {
    setTransactionHash(await state.contract.collectAd(user.account, inventoryId, adId));
  }

  return (
      <React.Fragment>
        <Typography variant="h4" gutterBottom={true}>
          Ad Management
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
              to="/ads/create"
          >
            Create new ad
          </Button>

          <Typography variant="h4" gutterBottom={true}>
            Your Ads
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
                      {isAdExpired(ad) &&
                          <CardActions>
                            <Button size="small" variant="outlined"
                                    onClick={() => onCollect(ad.inventoryId, ad.adId)}>
                              Collect
                            </Button>
                          </CardActions>}
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
  )

}