import React, {useContext, useState} from "react"
import {AppStateCtx} from "../App";
import {Box, Button, FormControl, FormHelperText, TextField, Typography} from "@material-ui/core";
import {NullableInventory} from "../clients/AdNetworkContractModels";
import RsaEncryptFunctions from "../functions/RsaEncryptFunctions";

export const InventoryCreatePage = (): JSX.Element => {
  const ctx = useContext(AppStateCtx);
  if (!ctx || !ctx.state.user) {
    return <p>Please Login</p>;
  }
  const state = ctx.state;
  const user = ctx.state.user;

  const [submitError, setSubmitError] = useState<string>();
  const [privateKey, setPrivateKey] = useState<string>();
  const [transactionHash, setTransactionHash] = useState<string>();
  const [inventory, setInventory] = useState<NullableInventory>({
    ownerAddress: user.account,
  });

  const onGeneratePublicKey = async () => {
    const [pri, pub] = await RsaEncryptFunctions.generateKeyPair();
    setPrivateKey(pri);
    setInventory(old => ({
      ...old,
      publicKey: pub
          .replace("-----BEGIN PUBLIC KEY-----\n", "")
          .replace("\n-----END PUBLIC KEY-----", ""),
    }))
  }

  const onSubmit = async () => {
    setSubmitError(undefined);

    try {
      const transactionHash = await state.contract.createInventory(inventory);
      setTransactionHash(transactionHash);
    } catch (error) {
      if (error instanceof Error) {
        setSubmitError(error.message);
      } else {
        setSubmitError("unknown error happened");
      }
    }
  }

  return (
      <React.Fragment>
        <Typography variant="h4" gutterBottom={true}>
          Inventory Create
        </Typography>
        <Box component="form">
          <div>
            <FormControl variant="standard">
              <TextField id="inventory-name-id"
                         label="Inventory Name"
                         onChange={event => setInventory(old => ({
                           ...old,
                           inventoryName: event.target.value
                         }))}/>
              <FormHelperText>Write inventory description</FormHelperText>
            </FormControl>
          </div>
          <div>
            <FormControl variant="standard">
              <TextField id="inventory-url-id"
                         label="Inventory URL"
                         onChange={event => setInventory(old => ({
                           ...old,
                           inventoryUrl: event.target.value
                         }))}/>
              <FormHelperText>Specify inventory url</FormHelperText>
            </FormControl>
          </div>
          <div>
            <FormControl variant="standard">
              <TextField id="floor-price-id"
                         label="Floor Price"
                         type="number"
                         onChange={event => setInventory(old => ({
                           ...old,
                           floorPrice: Number.parseInt(event.target.value),
                         }))}/>
              <FormHelperText>Specify floor price</FormHelperText>
            </FormControl>
          </div>
          <div>
            <FormControl variant="standard">
              <Box>
                <Button variant="outlined" onClick={onGeneratePublicKey}>
                  Generate key pair
                </Button>
                {privateKey &&
                    <Typography>
                      Generated Private key: {privateKey}
                    </Typography>
                }
              </Box>
              <TextField id="public-key-id"
                         label="Public Key"
                         value={inventory.publicKey ? inventory.publicKey : null}
                         onChange={event => setInventory(old => ({
                           ...old,
                           publicKey: event.target.value,
                         }))}/>
              <FormHelperText>Specify public key to encrypt AES key when ad owner create ad
                metadata</FormHelperText>
            </FormControl>
          </div>
          {submitError &&
              <Typography color="secondary">
                Error !: {submitError}
              </Typography>
          }
          <Button variant="contained" onClick={onSubmit}>
            Submit Inventory
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