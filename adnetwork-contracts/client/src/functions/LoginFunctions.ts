import {AdManageApiClient} from "../clients/AdManageApiClient";
import {EthUser} from "../App";
import {signObject} from "./SignFunctions";
import Web3 from "web3";

export const login = async (web3: Web3, client: AdManageApiClient, address: string): Promise<EthUser> => {
  const {challenge} = await client.getChallengeRandom({address});
  const signature = await signObject(web3, address, challenge);
  await client.login({address, signature});
  return {
    account: address
  };
};
