export interface IUserZernioQueueSlot {
  dayOfWeek: number;
  time: string;
}

export interface IUserZernioQueueProps {
  id: string;
  userId: string;
  zernioProfileId: string;
  zernioQueueId: string;
  name: string;
  timezone: string;
  slots: IUserZernioQueueSlot[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserZernioQueueUpsertProps {
  userId: string;
  zernioProfileId: string;
  zernioQueueId: string;
  name: string;
  timezone: string;
  slots: IUserZernioQueueSlot[];
  active: boolean;
}

export class UserZernioQueue {
  private readonly props: IUserZernioQueueProps;

  private constructor(props: IUserZernioQueueProps) {
    this.props = props;
  }

  static create(props: IUserZernioQueueUpsertProps): UserZernioQueue {
    const now = new Date();

    return new UserZernioQueue({
      id: "",
      ...props,
      createdAt: now,
      updatedAt: now,
    });
  }

  static restore(props: IUserZernioQueueProps): UserZernioQueue {
    return new UserZernioQueue(props);
  }

  get id(): string {
    return this.props.id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get zernioProfileId(): string {
    return this.props.zernioProfileId;
  }

  get zernioQueueId(): string {
    return this.props.zernioQueueId;
  }

  get name(): string {
    return this.props.name;
  }

  get timezone(): string {
    return this.props.timezone;
  }

  get slots(): IUserZernioQueueSlot[] {
    return this.props.slots.map((slot) => ({ ...slot }));
  }

  get active(): boolean {
    return this.props.active;
  }

  updateSchedule(input: Omit<IUserZernioQueueUpsertProps, "userId">): void {
    this.props.zernioProfileId = input.zernioProfileId;
    this.props.zernioQueueId = input.zernioQueueId;
    this.props.name = input.name;
    this.props.timezone = input.timezone;
    this.props.slots = input.slots.map((slot) => ({ ...slot }));
    this.props.active = input.active;
    this.props.updatedAt = new Date();
  }

  toObject(): IUserZernioQueueProps {
    return {
      ...this.props,
      slots: this.props.slots.map((slot) => ({ ...slot })),
    };
  }
}
