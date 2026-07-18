import { RideOrderService } from './ride-order.service';

describe('RideOrderService critical transitions', () => {
  const createService = (tx: any) => {
    const prisma = {
      $transaction: jest.fn((callback: (client: any) => unknown) =>
        callback(tx),
      ),
    };
    return {
      service: new RideOrderService(prisma as any, {} as any),
      prisma,
    };
  };

  it('claims a NEW order and creates its ride in the same transaction', async () => {
    const driver = { id: 8, tgId: 900n, isApproved: true };
    const order = { id: 42, status: 'MATCHED' };
    const tx = {
      driver: { findUnique: jest.fn().mockResolvedValue(driver) },
      rideOrder: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUnique: jest.fn().mockResolvedValue(order),
      },
      ride: {
        upsert: jest.fn().mockResolvedValue({ id: 5, clientRequestId: 42 }),
      },
    };
    const { service } = createService(tx);

    const result = await service.acceptByDriver(42, 900);

    expect(result.ok).toBe(true);
    expect(tx.rideOrder.updateMany).toHaveBeenCalledWith({
      where: { id: 42, status: 'NEW' },
      data: { status: 'MATCHED' },
    });
    expect(tx.ride.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { clientRequestId: 42 } }),
    );
  });

  it('does not let an unapproved driver claim an order', async () => {
    const tx = {
      driver: {
        findUnique: jest.fn().mockResolvedValue({ id: 8, isApproved: false }),
      },
      rideOrder: { updateMany: jest.fn() },
      ride: { upsert: jest.fn() },
    };
    const { service } = createService(tx);

    const result = await service.acceptByDriver(42, 900);

    expect(result).toEqual({ ok: false, reason: 'NOT_APPROVED' });
    expect(tx.rideOrder.updateMany).not.toHaveBeenCalled();
    expect(tx.ride.upsert).not.toHaveBeenCalled();
  });

  it('lets only one competing driver win the conditional NEW claim', async () => {
    const tx = {
      driver: {
        findUnique: jest.fn().mockResolvedValue({ id: 9, isApproved: true }),
      },
      rideOrder: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        findUnique: jest.fn().mockResolvedValue({ id: 42, status: 'MATCHED' }),
      },
      ride: { upsert: jest.fn() },
    };
    const { service } = createService(tx);

    const result = await service.acceptByDriver(42, 901);

    expect(result).toEqual({ ok: false, reason: 'ALREADY_TAKEN' });
    expect(tx.ride.upsert).not.toHaveBeenCalled();
  });
});
