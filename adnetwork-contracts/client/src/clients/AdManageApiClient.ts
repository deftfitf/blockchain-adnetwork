import axios, {AxiosError, AxiosInstance} from "axios";
import {isAllowedImageMIMEType} from "../functions/UtilityFunctions";

export type ChallengeRequest = {
  address: string;
}

export type ChallengeResponse = {
  challenge: string;
}

export type LoginRequest = {
  address: string;
  signature: string;
}

export type LoginCheckResponse = {
  address: string | null;
}

export class AdManageApiClient {

  constructor(private readonly axiosInstance: AxiosInstance) {
  }

  getChallengeRandom: (req: ChallengeRequest) => Promise<ChallengeResponse> = async (req) => {
    return await this.post("/api/login/challenge", req);
  };

  loginCheck: () => Promise<LoginCheckResponse> = async () => {
    try {
      return await this.post("/api/login/check", null);
    } catch (error) {
      return {
        address: null
      }
    }
  }

  login: (req: LoginRequest) => Promise<void> = async (req) => {
    try {
      await this.axiosInstance.post(
          "/api/login",
          null,
          {
            headers: {
              'X-ETH-ADDRESS': req.address,
              'X-AUTH-SIGNATURE': req.signature
            },
          }
      );
    } catch (error) {
      if (axios.isAxiosError(error)) {
        this.handleAxiosError(error);
      } else {
        this.handleUnexpectedError(error);
      }
    }
  };

  logout: () => Promise<void> = async () => {
    return await this.post("/api/logout", null);
  };

  uploadAdImage: (adImageFile: File) => Promise<string> = async (adImageFile) => {
    if (!isAllowedImageMIMEType(adImageFile)) {
      throw new Error(`MIME type ${adImageFile.type} is not allowed.`);
    }

    const params = new FormData();
    params.append('adImage', adImageFile);
    try {
      const {data} = await this.axiosInstance.post(
          "/api/ad/image",
          params,
          {
            headers: {
              'content-type': 'multipart/form-data',
            },
          }
      );
      return data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        this.handleAxiosError(error);
      } else {
        this.handleUnexpectedError(error);
      }
    }
  };

  createAd = async (encodedAdFormat: string): Promise<string> => {
    return await this.post("/api/ad/create", {
      encodedAdFormatV1: encodedAdFormat
    });
  }

  private get: <T, R>(path: string) => Promise<R> = async (path) => {
    try {
      const {data} = await this.axiosInstance.get(path);
      return data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        this.handleAxiosError(error);
      } else {
        this.handleUnexpectedError(error);
      }
    }
  }

  private post: <T, R>(path: string, body: T) => Promise<R> = async (path, body) => {
    try {
      const {data} = await this.axiosInstance.post(path, body);
      return data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        this.handleAxiosError(error);
      } else {
        this.handleUnexpectedError(error);
      }
    }
  }

  private handleAxiosError = (e: AxiosError) => {
    throw e;
  }

  private handleUnexpectedError = (e: unknown) => {
    throw e;
  }

}