import { Context } from 'telegraf';

export type BotAudience = 'all' | 'admin' | 'client' | 'driver';

export type SafeContext = Context & {
  chat: {
    id: number;
    type: 'private' | 'group' | 'supergroup' | 'channel';
    title?: string;
  };
  from: {
    id: number;
    username?: string;
    first_name?: string;
    last_name?: string;
  };
  message: any;
};

export type RideFlowState = {
  step: 'from' | 'to' | 'count' | 'phone' | 'confirm';
  fromId?: number;
  fromName?: string;
  toId?: number;
  toName?: string;
  count?: number;
  phone?: string;
};

export type DriverRegFlowState = {
  step: 'fullName' | 'phone' | 'carNumber' | 'carPhoto';
  fullName?: string;
  phone?: string;
  carNumber?: string;
  carPhotoId?: string;
};

export type DriverPostFlowState = {
  step: 'from' | 'to' | 'seats' | 'price' | 'note' | 'confirm';
  fromId?: number;
  fromName?: string;
  toId?: number;
  toName?: string;
  seats?: number;
  price?: string;
  note?: string;
};
