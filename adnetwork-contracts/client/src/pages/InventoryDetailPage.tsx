import React, {useContext, useEffect, useState} from "react";
import {AppStateCtx} from "../App";
import {Ad, Inventory} from "../clients/AdNetworkContractModels";
import {Link, useParams} from "react-router-dom";
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Container,
  FormControl,
  FormHelperText,
  Grid,
  TextField,
  Typography
} from "@material-ui/core";
import moment from "moment";
import RsaEncryptFunctions from "../functions/RsaEncryptFunctions";
import AesEncryptFunctions from "../functions/AesEncryptFunctions";
import {AdFormatV1} from "../ads/AdFormatV1";

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
  const [inventoryPrivateKey, setInventoryPrivateKey] = useState<CryptoKey>();
  const [transactionHash, setTransactionHash] = useState<string>();
  const [adFormatV1, setAdFormatV1] = useState<AdFormatV1>();
  const [privateKey, setPrivateKey] = useState<string>();

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

  const onDecrypt = async (adHash: string) => {
    if (!inventoryPrivateKey) {
      return;
    }

    const adFormat = await state.adManageApi.getAdFormat(adHash);
    const [, encryptedEncryptionKey, ciphertext] = adFormat.split(":");

    const encryptionKey = await RsaEncryptFunctions.decryptMessage(encryptedEncryptionKey, inventoryPrivateKey);
    const secret = await AesEncryptFunctions.importSecretKey(encryptionKey);
    const decrypted = await AesEncryptFunctions.decryptMessage(ciphertext, secret);

    setAdFormatV1(JSON.parse(decrypted) as AdFormatV1);
  }

  const onRegister = async () => {
    if (!privateKey) {
      return;
    }
    await state.adManageApi.registerInventory(inventoryId.toString(), privateKey);
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
            <CardActions>
              <Typography>Set inventory private key</Typography>
              <div>
                <FormControl variant="standard">
                  <TextField id="private-key-id"
                             label="Private Key for Delivery"
                             onChange={event => setPrivateKey(event.target.value)}/>
                  <FormHelperText>Specify the private key to be set for the delivery
                    server</FormHelperText>
                </FormControl>
              </div>
              <Button variant="outlined" onClick={() => onRegister()}>
                Register for Delivery
              </Button>
            </CardActions>
          </Card>

          <div>
            <FormControl variant="standard">
              <TextField id="private-key-input"
                         label="Inventory Private Key"
                         onChange={async (event) => {
                           const privateKey = await RsaEncryptFunctions.importPrivateKey(event.target.value);
                           setInventoryPrivateKey(privateKey);
                         }}/>
              <FormHelperText>Set your inventory key</FormHelperText>
            </FormControl>
          </div>

          {adFormatV1 && <div>
            <Typography variant="h4" gutterBottom={true}>
              Decrypted AdFormatV1
            </Typography>
            <Card>
              <CardContent>
                <Typography gutterBottom variant="h5" component="h2">
                  Inventory ID: {adFormatV1.inventoryId}
                </Typography>
                <Typography>Owner Address: {adFormatV1.ownerAddress}</Typography>
                <Typography>
                  Delivery
                  Duration: {moment(adFormatV1.startTime * 1000).format()} ~ {moment(adFormatV1.endTime * 1000).format()}
                </Typography>
                <Typography>Ad Price: {adFormatV1.adPrice}</Typography>
                <Typography>Ad Title: {adFormatV1.adTitle}</Typography>
                <Typography>Ad Description: {adFormatV1.adDescription}</Typography>
                <Typography>Landing Page URL: {adFormatV1.landingPageUrl}</Typography>
                <Box>
                  <Typography>Display Image URL: {adFormatV1.displayImageUrl}</Typography>
                  <img
                      src={adFormatV1.displayImageUrl}
                      alt="Uploaded Ad Image"
                      loading="lazy"
                  />
                </Box>
              </CardContent>
            </Card>
          </div>}

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
                        <Button variant="outlined" onClick={() => onDecrypt(ad.adHash)}>
                          Decrypt AdFormat
                        </Button>
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