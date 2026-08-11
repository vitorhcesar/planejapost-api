export interface IMetaAppConfigProps {
  id: string;
  publicId: string;
  userId: string;
  label: string;
  appId: string;
  appSecret: string;
  redirectUri: string;
  requestedScopes: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IMetaAppConfigCreateProps {
  publicId: string;
  userId: string;
  label: string;
  appId: string;
  appSecret: string;
  redirectUri: string;
  requestedScopes: string[];
}

export class MetaAppConfig {
  private readonly props: IMetaAppConfigProps;

  private constructor(props: IMetaAppConfigProps) {
    this.props = props;
  }

  static create(props: IMetaAppConfigCreateProps): MetaAppConfig {
    const now = new Date();

    return new MetaAppConfig({
      ...props,
      id: "",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  }

  static restore(props: IMetaAppConfigProps): MetaAppConfig {
    return new MetaAppConfig(props);
  }

  get id(): string {
    return this.props.id;
  }

  get publicId(): string {
    return this.props.publicId;
  }

  get userId(): string {
    return this.props.userId;
  }

  get label(): string {
    return this.props.label;
  }

  get appId(): string {
    return this.props.appId;
  }

  get appSecret(): string {
    return this.props.appSecret;
  }

  get redirectUri(): string {
    return this.props.redirectUri;
  }

  get requestedScopes(): string[] {
    return [...this.props.requestedScopes];
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  rotateSecret(appSecret: string): void {
    this.props.appSecret = appSecret;
    this.props.updatedAt = new Date();
  }

  deactivate(): void {
    this.props.isActive = false;
    this.props.updatedAt = new Date();
  }

  toObject(): IMetaAppConfigProps {
    return {
      ...this.props,
      requestedScopes: [...this.props.requestedScopes],
    };
  }
}
