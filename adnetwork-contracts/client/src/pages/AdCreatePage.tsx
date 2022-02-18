import React, {useContext, useEffect, useState} from "react";
import {AppStateCtx} from "../App";
import {
  Box,
  Button,
  FormControl,
  FormHelperText,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  TextField,
  Typography
} from "@material-ui/core";

import {AdFormatV1, NullableAdFormatV1, nullableAdToNonNullableConvert} from "../ads/AdFormatV1";
import {DateTimePicker, MuiPickersUtilsProvider} from "@material-ui/pickers";
import MomentUtils from "@date-io/moment";
import moment, {Moment} from "moment";
import {Inventory, NullableAd} from "../clients/AdNetworkContractModels";
import AesEncryptFunctions from "../functions/AesEncryptFunctions";
import {bytesToHexString} from "../functions/UtilityFunctions";
import RsaEncryptFunctions from "../functions/RsaEncryptFunctions";

// TODO
// ${header:8bytes}${encryptedKeyWithInventoryOwnerPubkeyBytes:256bytes}${aesEncryptedAdBytes}
// ${header:8bytes}${encryptedKeyWithDeliveryPubkeyBytes:256bytes}${aesEncryptedAdBytes}
// それぞれのデータをアップロードした結果、SHA-3 keccak hashによりアップロード先ハッシュが決定
// インベントリオーナーは審査のためにデータが確認可能で, 配信者も配信者の秘密鍵によって,　配信設定が可能.

export const AdCreatePage = (): JSX.Element => {
  const ctx = useContext(AppStateCtx);
  if (!ctx || !ctx.state.user) {
    return <p>Please Login</p>;
  }
  const state = ctx.state;
  const user = ctx.state.user;

  const [ad, setAd] = useState<NullableAdFormatV1>({
    ownerAddress: user.account,
    nonce: AesEncryptFunctions.generateKey(),
  });
  const [inventory, setInventory] = useState<Inventory>();
  const [aesEncryptionKey, setAesEncryptionKey] = useState<string>();
  const [aesEncryptionKeyForDelivery, setAesEncryptionKeyForDelivery] = useState<string>();
  const [transactionHash, setTransactionHash] = useState<string>();
  const [submitError, setSubmitError] = useState<string>();

  useEffect(() => {
    return () => {
    };
  }, []);

  const encodeAdFormatV1 = async (adFormatV1: AdFormatV1, encryptionKey: string, publicKey: string): Promise<string> => {
    if (!encryptionKey) {
      throw new Error("Please specify encryption key");
    }

    // encrypt ad format v1 message by aes key
    const secret = await AesEncryptFunctions.importSecretKey(encryptionKey);
    const header = bytesToHexString(new Uint8Array([0x01]));
    const adFormatV1String = JSON.stringify(adFormatV1);
    const ciphertext = await AesEncryptFunctions.encryptMessage(adFormatV1String, secret);

    // encrypt encryption key by public key
    const pemPublicKey = `-----BEGIN PUBLIC KEY-----\n${publicKey}\n-----END PUBLIC KEY-----`;
    const rsaPublicKey = await RsaEncryptFunctions.importPublicKey(pemPublicKey);
    const encryptedEncryptionKey = await RsaEncryptFunctions.encryptMessage(encryptionKey, rsaPublicKey);
    console.debug(`${header}:${encryptedEncryptionKey}:${ciphertext}`);

    // return formatted text
    return `${header}${encryptedEncryptionKey}${ciphertext}`
  }

  const onGenerateEncryptionKey = () => {
    setAesEncryptionKey(AesEncryptFunctions.generateKey());
    setAesEncryptionKeyForDelivery(AesEncryptFunctions.generateKey());
  }

  const onSubmit = async () => {
    setSubmitError(undefined);

    if (!aesEncryptionKey || !aesEncryptionKeyForDelivery) {
      throw new Error("Both encryption key must be needed");
    }

    if (!inventory) {
      throw new Error("Inventory that will be targeted is not specified");
    }

    const adFormatV1 = nullableAdToNonNullableConvert(ad);
    const encodedAdFormatV1 = await encodeAdFormatV1(adFormatV1, aesEncryptionKey, inventory.publicKey);
    const encodedAdFormatV1ForDelivery = await encodeAdFormatV1(adFormatV1, aesEncryptionKey, inventory.publicKey);

    const adHash = await state.adManageApi.createAd(encodedAdFormatV1);
    const adHashForDelivery = await state.adManageApi.createAd(encodedAdFormatV1ForDelivery);

    const onChainAd: NullableAd = {
      inventoryId: ad.inventoryId,
      ownerAddress: ad.ownerAddress,
      adHash: adHash,
      adHashForDelivery: adHashForDelivery,
      start: ad.startTime,
      end: ad.endTime,
    }

    if (!ad.adPrice) {
      setSubmitError("ad price is empty");
      return;
    }

    try {
      const transactionHash = await state.contract.createAd(onChainAd, ad.adPrice);
      setTransactionHash(transactionHash);
    } catch (error) {
      if (error instanceof Error) {
        setSubmitError(error.message);
      } else {
        setSubmitError("unknown error happened");
      }
    }
  }

  const onChangeInventoryId: (_inventoryId: string) => void = async (_inventoryId) => {
    const inventoryId = Number.parseInt(_inventoryId);
    const inventory = await state.contract.getInventory(inventoryId);
    if (!inventory) {
      return;
    }

    setInventory(inventory);

    setAd(old => ({
      ...old,
      inventoryId: inventory.inventoryId,
      startTime: moment().unix(),
      endTime: moment().unix(),
    }));
  };

  const onAdImageUpload: (elem: HTMLInputElement) => void = async (elem) => {
    if (!elem.files) {
      return;
    }
    const file = elem.files.item(0);
    if (!file) {
      return;
    }

    const imageName = await state.adManageApi.uploadAdImage(file);
    const imageUrl = `http://localhost:8080/public/${imageName}`

    setAd(old => ({
      ...old,
      displayImageUrl: imageUrl,
    }));
  }

  const onStartDateChange: (date: Moment | null) => void = (date) => {
    if (!date) {
      return;
    }
    setAd(old => ({
      ...old,
      startTime: date.unix()
    }));
  };

  const onEndDateChange: (date: Moment | null) => void = (date) => {
    if (!date) {
      return;
    }
    setAd(old => ({
      ...old,
      endTime: date.unix()
    }));
  };

  return (
      <React.Fragment>
        <Typography variant="h4" gutterBottom={true}>
          Ad Create
        </Typography>
        <Box component="form">
          <div>
            <FormControl variant="standard">
              {inventory && <TableContainer component={Paper}>
                <Table size="small">
                  <TableBody>
                    <TableRow>
                      <TableCell component="th" scope="row">Inventory ID</TableCell>
                      <TableCell>{inventory.inventoryId}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell component="th" scope="row">Owner Address</TableCell>
                      <TableCell>{inventory.ownerAddress}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell component="th" scope="row">Inventory Name</TableCell>
                      <TableCell>{inventory.inventoryName}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell component="th" scope="row">Inventory URL</TableCell>
                      <TableCell>{inventory.inventoryUrl}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell component="th" scope="row">Public Key</TableCell>
                      <TableCell>{inventory.publicKey}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell component="th" scope="row">Floor Price</TableCell>
                      <TableCell>{inventory.floorPrice}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>}
              <TextField id="inventory-id"
                         label="Delivery Inventory ID"
                         type="number"
                         onChange={event => onChangeInventoryId(event.target.value)}/>
              <FormHelperText>Specify target inventory</FormHelperText>
            </FormControl>
          </div>
          <div>
            <MuiPickersUtilsProvider utils={MomentUtils}>
              <FormControl variant="standard">
                <DateTimePicker
                    label="Delivery Start Time"
                    value={ad.startTime ? moment(ad.startTime * 1000) : null}
                    onChange={onStartDateChange}
                />
                <FormHelperText>Please specify the start period of ad delivery</FormHelperText>
              </FormControl>
              <FormControl variant="standard">
                <DateTimePicker
                    label="Delivery End Time"
                    value={ad.endTime ? moment(ad.endTime * 1000) : null}
                    onChange={onEndDateChange}
                />
                <FormHelperText>Please specify the end period of ad delivery</FormHelperText>
              </FormControl>
            </MuiPickersUtilsProvider>
          </div>
          <div>
            <FormControl variant="standard">
              <TextField id="ad-price-input"
                         label="Ad Price"
                         type="number"
                         onChange={event => setAd(old => ({
                           ...old,
                           adPrice: Number.parseInt(event.target.value)
                         }))}/>
              <FormHelperText>Specify ad price</FormHelperText>
            </FormControl>
          </div>
          <div>
            <FormControl variant="standard">
              <TextField id="ad-title-input"
                         label="Ad Title"
                         onChange={event => setAd(old => ({
                           ...old,
                           adTitle: event.target.value
                         }))}/>
              <FormHelperText>Type your ad title</FormHelperText>
            </FormControl>
          </div>
          <div>
            <FormControl variant="standard">
              <TextField id="ad-description-input"
                         label="Ad Description"
                         onChange={event => setAd(old => ({
                           ...old,
                           adDescription: event.target.value
                         }))}/>
              <FormHelperText>Type your ad description</FormHelperText>
            </FormControl>
          </div>
          <div>
            <FormControl variant="standard">
              <TextField id="landing-page-url-input"
                         label="Landing Page URL"
                         onChange={event => setAd(old => ({
                           ...old,
                           landingPageUrl: event.target.value
                         }))}/>
              <FormHelperText>Specify landing page url</FormHelperText>
            </FormControl>
          </div>
          <div>
            <FormControl variant="standard">
              {ad.displayImageUrl &&
                  <Box>
                    <Typography>
                      Uploaded Display Image URL: {ad.displayImageUrl}
                    </Typography>
                    <img
                        src={ad.displayImageUrl}
                        alt="Uploaded Ad Image"
                        loading="lazy"
                    />
                  </Box>
              }
              <Button id="upload-ad-image">
                <input
                    type="file"
                    onChange={event => onAdImageUpload(event.target)}
                />
              </Button>
              <FormHelperText>Please upload your ad image</FormHelperText>
            </FormControl>
          </div>
          <div>
            <FormControl variant="standard">
              <Box>
                <Button variant="outlined" onClick={onGenerateEncryptionKey}>
                  Generate encryption key
                </Button>
                {aesEncryptionKey && <React.Fragment>
                  <Typography>
                    Generated encryption key: {aesEncryptionKey}
                  </Typography>
                  <Typography>
                    Generated encryption key for delivery: {aesEncryptionKeyForDelivery}
                  </Typography>
                </React.Fragment>
                }
              </Box>
              <TextField id="aes-key-id"
                         label="Secret Key"
                         value={aesEncryptionKey}
                         onChange={event => setAesEncryptionKey(event.target.value)}/>
              <FormHelperText>Specify public key to encrypt AES key when ad owner create ad
                metadata</FormHelperText>
              <TextField id="aes-key-id"
                         label="Secret Key"
                         value={aesEncryptionKeyForDelivery}
                         onChange={event => setAesEncryptionKeyForDelivery(event.target.value)}/>
              <FormHelperText>Specify public key to encrypt AES key when ad owner create ad
                metadata for delivery</FormHelperText>
            </FormControl>
          </div>
          {submitError &&
              <Typography color="secondary">
                Error !: {submitError}
              </Typography>
          }
          <Button variant="contained" onClick={onSubmit}>
            Submit Ad
          </Button>

          {transactionHash && <div>
            <Typography>
              Submitted Transaction: {transactionHash}
            </Typography>
          </div>}
        </Box>
      </React.Fragment>
  );

}