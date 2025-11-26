export class LoginResponseDTO {
  accessToken: string;
  // refreshToken may be returned for non-browser clients; with cookie flows you don't need it in JSON
  refreshToken?: string;
}
