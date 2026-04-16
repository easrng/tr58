interface URL {
  hash: string;
  host: string;
  hostname: string;
  href: string;
  readonly origin: string;
  password: string;
  pathname: string;
  port: string;
  protocol: string;
  search: string;
  username: string;
}
declare var URL: {
  new (url: string | URL, base?: string | URL): URL;
};
declare var console: {
  warn(str: string): void;
};
