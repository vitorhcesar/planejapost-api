import { AppRoleEnum } from "@/domain/enums/app-role.enum";

export interface IUserProps {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  role: AppRoleEnum;
  zernioProfileId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserCreateProps {
  name: string;
  email: string;
  emailVerified?: boolean;
  image?: string | null;
  role?: AppRoleEnum;
}

export class User {
  private readonly props: IUserProps;

  private constructor(props: IUserProps) {
    this.props = props;
  }

  static create(props: IUserCreateProps): User {
    const now = new Date();

    return new User({
      id: "",
      name: props.name,
      email: props.email,
      emailVerified: props.emailVerified ?? false,
      image: props.image ?? null,
      role: props.role ?? AppRoleEnum.CLIENT,
      zernioProfileId: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  static restore(props: IUserProps): User {
    return new User(props);
  }

  get id(): string {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get email(): string {
    return this.props.email;
  }

  get emailVerified(): boolean {
    return this.props.emailVerified;
  }

  get image(): string | null {
    return this.props.image;
  }

  get role(): AppRoleEnum {
    return this.props.role;
  }

  get zernioProfileId(): string | null {
    return this.props.zernioProfileId;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  isAdmin(): boolean {
    return this.props.role === AppRoleEnum.ADMIN;
  }

  setZernioProfileId(zernioProfileId: string): void {
    this.props.zernioProfileId = zernioProfileId;
    this.props.updatedAt = new Date();
  }

  toObject(): IUserProps {
    return { ...this.props };
  }
}
