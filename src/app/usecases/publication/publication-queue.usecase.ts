import { AppError } from "@/domain/errors/app.error";
import { UserZernioQueue } from "@/domain/entities/user-zernio-queue.entity";
import type { IUserZernioQueueRepository } from "@/domain/repositories/user-zernio-queue.repository";
import type { IUserRepository } from "@/domain/repositories/user.repository";
import { EnsureZernioProfileUseCase } from "@/app/usecases/zernio/ensure-zernio-profile.usecase";
import type { IZernioQueueService } from "@/domain/zernio/zernio-queue.service";
import {
  isValidIanaTimezone,
  parseScheduledForToUtcDate,
  scheduledForHasExplicitOffset,
} from "@/domain/utils/parse-scheduled-for.util";
import { mapZernioErrorToAppError } from "@/domain/zernio/map-zernio-error.util";

export interface IPublicationQueueSlotDto {
  dayOfWeek: number;
  time: string;
}

export interface IPublicationQueueDto {
  configured: boolean;
  queueId: string | null;
  name: string | null;
  timezone: string | null;
  slots: IPublicationQueueSlotDto[];
  active: boolean;
  nextSlot: string | null;
  nextSlots: string[];
}

export interface IUpsertPublicationQueueInput {
  name?: string;
  timezone: string;
  slots: IPublicationQueueSlotDto[];
  active?: boolean;
}

const DEFAULT_QUEUE_NAME = "Horários PlanejaPost";

export class GetPublicationQueueUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly userZernioQueueRepository: IUserZernioQueueRepository,
    private readonly ensureZernioProfileUseCase: EnsureZernioProfileUseCase,
    private readonly zernioQueueService: IZernioQueueService,
  ) {}

  async execute(authUserId: string): Promise<IPublicationQueueDto> {
    const user = await this.userRepository.findById(authUserId);

    if (!user) {
      throw new AppError("Usuário não encontrado", 404, "user_not_found");
    }

    const localQueue = await this.userZernioQueueRepository.findByUserId(authUserId);

    if (!localQueue) {
      return {
        configured: false,
        queueId: null,
        name: null,
        timezone: null,
        slots: [],
        active: false,
        nextSlot: null,
        nextSlots: [],
      };
    }

    const profileId = await this.ensureZernioProfileUseCase.execute(authUserId);

    try {
      const remoteQueue = await this.zernioQueueService.getQueueSchedule({
        profileId,
        queueId: localQueue.zernioQueueId,
      });

      const nextSlot = await this.zernioQueueService.getNextQueueSlot({
        profileId,
        queueId: localQueue.zernioQueueId,
      });

      if (remoteQueue) {
        return {
          configured: true,
          queueId: remoteQueue.queueId,
          name: remoteQueue.name,
          timezone: remoteQueue.timezone,
          slots: remoteQueue.slots,
          active: remoteQueue.active,
          nextSlot: nextSlot?.scheduledFor ?? remoteQueue.nextSlots[0] ?? null,
          nextSlots: remoteQueue.nextSlots,
        };
      }
    } catch (error) {
      throw mapZernioErrorToAppError(error);
    }

    return {
      configured: true,
      queueId: localQueue.zernioQueueId,
      name: localQueue.name,
      timezone: localQueue.timezone,
      slots: localQueue.slots,
      active: localQueue.active,
      nextSlot: null,
      nextSlots: [],
    };
  }
}

export class UpsertPublicationQueueUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly userZernioQueueRepository: IUserZernioQueueRepository,
    private readonly ensureZernioProfileUseCase: EnsureZernioProfileUseCase,
    private readonly zernioQueueService: IZernioQueueService,
  ) {}

  async execute(
    authUserId: string,
    input: IUpsertPublicationQueueInput,
  ): Promise<IPublicationQueueDto> {
    const user = await this.userRepository.findById(authUserId);

    if (!user) {
      throw new AppError("Usuário não encontrado", 404, "user_not_found");
    }

    this.validateQueueInput(input);

    const profileId = await this.ensureZernioProfileUseCase.execute(authUserId);
    const existingQueue = await this.userZernioQueueRepository.findByUserId(authUserId);

    try {
      const remoteQueue = await this.zernioQueueService.upsertQueueSchedule({
        profileId,
        queueId: existingQueue?.zernioQueueId,
        name: input.name?.trim() || existingQueue?.name || DEFAULT_QUEUE_NAME,
        timezone: input.timezone,
        slots: input.slots,
        active: input.active ?? true,
      });

      const savedQueue = existingQueue
        ? await this.saveUpdatedQueue(existingQueue, remoteQueue, authUserId, profileId)
        : await this.userZernioQueueRepository.save(
            UserZernioQueue.create({
              userId: authUserId,
              zernioProfileId: profileId,
              zernioQueueId: remoteQueue.queueId,
              name: remoteQueue.name,
              timezone: remoteQueue.timezone,
              slots: remoteQueue.slots,
              active: remoteQueue.active,
            }),
          );

      const nextSlot = await this.zernioQueueService.getNextQueueSlot({
        profileId,
        queueId: savedQueue.zernioQueueId,
      });

      return {
        configured: true,
        queueId: savedQueue.zernioQueueId,
        name: savedQueue.name,
        timezone: savedQueue.timezone,
        slots: savedQueue.slots,
        active: savedQueue.active,
        nextSlot: nextSlot?.scheduledFor ?? remoteQueue.nextSlots[0] ?? null,
        nextSlots: remoteQueue.nextSlots,
      };
    } catch (error) {
      throw mapZernioErrorToAppError(error);
    }
  }

  private async saveUpdatedQueue(
    existingQueue: UserZernioQueue,
    remoteQueue: Awaited<ReturnType<IZernioQueueService["upsertQueueSchedule"]>>,
    authUserId: string,
    profileId: string,
  ) {
    existingQueue.updateSchedule({
      zernioProfileId: profileId,
      zernioQueueId: remoteQueue.queueId,
      name: remoteQueue.name,
      timezone: remoteQueue.timezone,
      slots: remoteQueue.slots,
      active: remoteQueue.active,
    });

    return this.userZernioQueueRepository.save(existingQueue);
  }

  private validateQueueInput(input: IUpsertPublicationQueueInput): void {
    if (!isValidIanaTimezone(input.timezone)) {
      throw new AppError("timezone inválido", 400, "invalid_timezone");
    }

    if (!input.slots.length) {
      throw new AppError(
        "Informe ao menos um horário na fila",
        400,
        "queue_slots_required",
      );
    }

    for (const slot of input.slots) {
      if (!Number.isInteger(slot.dayOfWeek) || slot.dayOfWeek < 0 || slot.dayOfWeek > 6) {
        throw new AppError("dayOfWeek inválido", 400, "invalid_queue_slot");
      }

      if (!/^\d{2}:\d{2}$/.test(slot.time)) {
        throw new AppError("time inválido", 400, "invalid_queue_slot");
      }
    }
  }
}

export function parseZernioScheduledFor(
  value: string | null,
  timezone: string,
): Date | null {
  if (!value) {
    return null;
  }

  if (scheduledForHasExplicitOffset(value)) {
    return new Date(value);
  }

  return parseScheduledForToUtcDate(value, timezone);
}
