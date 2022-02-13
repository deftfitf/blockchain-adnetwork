import Web3 from "web3";

export const signObject = async (web3: Web3, address: string, message: string): Promise<string> => {
  return await web3.eth.personal.sign(
      message, address,
      "" // This will be ignored by Metamask
  );
};