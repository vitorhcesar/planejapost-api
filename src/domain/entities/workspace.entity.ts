export interface IWorkspaceProps {
  id: string;
  userId: string;
  name: string;
  slug: string;
  description: string | null;
  color: string | null;
  isDefault: boolean;
  archivedAt: Date | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IWorkspaceCreateProps {
  userId: string;
  name: string;
  slug: string;
  description?: string | null;
  color?: string | null;
  isDefault?: boolean;
  sortOrder?: number;
}

export class Workspace {
  private props: IWorkspaceProps;

  private constructor(props: IWorkspaceProps) {
    this.props = props;
  }

  static create(props: IWorkspaceCreateProps): Workspace {
    const now = new Date();

    return new Workspace({
      id: "",
      userId: props.userId,
      name: props.name,
      slug: props.slug,
      description: props.description ?? null,
      color: props.color ?? null,
      isDefault: props.isDefault ?? false,
      archivedAt: null,
      sortOrder: props.sortOrder ?? 0,
      createdAt: now,
      updatedAt: now,
    });
  }

  static restore(props: IWorkspaceProps): Workspace {
    return new Workspace(props);
  }

  get id(): string {
    return this.props.id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get name(): string {
    return this.props.name;
  }

  get slug(): string {
    return this.props.slug;
  }

  get description(): string | null {
    return this.props.description;
  }

  get color(): string | null {
    return this.props.color;
  }

  get isDefault(): boolean {
    return this.props.isDefault;
  }

  get archivedAt(): Date | null {
    return this.props.archivedAt;
  }

  get sortOrder(): number {
    return this.props.sortOrder;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  isArchived(): boolean {
    return this.props.archivedAt !== null;
  }

  belongsToUser(userId: string): boolean {
    return this.props.userId === userId;
  }

  update(input: {
    name?: string;
    slug?: string;
    description?: string | null;
    color?: string | null;
    sortOrder?: number;
  }): void {
    if (input.name !== undefined) {
      this.props.name = input.name;
    }

    if (input.slug !== undefined) {
      this.props.slug = input.slug;
    }

    if (input.description !== undefined) {
      this.props.description = input.description;
    }

    if (input.color !== undefined) {
      this.props.color = input.color;
    }

    if (input.sortOrder !== undefined) {
      this.props.sortOrder = input.sortOrder;
    }

    this.props.updatedAt = new Date();
  }

  archive(): void {
    this.props.archivedAt = new Date();
    this.props.updatedAt = new Date();
  }

  setId(id: string): void {
    this.props.id = id;
  }

  toObject(): IWorkspaceProps {
    return { ...this.props };
  }
}
