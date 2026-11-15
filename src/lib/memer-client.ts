import axios from 'axios';
import { CONFIG } from '../config';
import { logger } from './logger';

export type MemerItem = {
  id: number;
  itemKey: string;
  name: string;
  type: string;
  value: number;
  emoji: string;
  flags: {
    CONSUMABLE: boolean;
    PURCHASEABLE: boolean;
    REUSABLE: boolean;
    TRANSFERABLE: boolean;
  };
  rarity: string;
  marketValue: number;
  description: string;
  longDescription: string | null;
  imageURL: string;
  skins: Record<string, {
      name: string;
      rarity: string;
      imageURL: string;
    }>;
};

export type MemerUser = {
  flags: string[];
  pocket: number;
  bank: number;
  commands: number;
  premium: any;
  banned: {
    is: boolean;
    by: string;
    until: number;
    reason: string;
  };
};

export type MemerUserLookup =
  | { status: 'found'; user: MemerUser }
  | { status: 'not-found' }
  | { status: 'unavailable' };

class Memer {
  public items: MemerItem[] = [];

  public async init(): Promise<void> {
    await this.updateItems();
  }

  public async updateItems(): Promise<void> { // TODO: update items peridoically
    const response = await axios(`${CONFIG.memer.apiUrl}/currency/items`, {
      headers: {
        Authorization: CONFIG.memer.token,
      },
    });

    this.items = response.data;
  }

  public async getUser(id: string): Promise<MemerUserLookup> {
    return axios<MemerUser>(`${CONFIG.memer.apiUrl}/currency/inspect/user/${id}/main`, {
      timeout: 5_000,
      headers: {
        Authorization: CONFIG.memer.token,
      },
    })
      .then((response): MemerUserLookup => {
        if (!Number.isFinite(response.data?.commands) || response.data.commands < 0) {
          logger.warn(`Invalid Dank Memer user data for ${id}; skipping API-based join checks`);
          return { status: 'unavailable' };
        }

        return { status: 'found', user: response.data };
      })
      .catch((error): MemerUserLookup => {
        if (axios.isAxiosError(error) && error.response?.status === 404 && error.response.data?.error === 'User not found') {
          return { status: 'not-found' };
        }

        logger.warn(`Failed to fetch Dank Memer user ${id}; skipping API-based join checks: ${error.message}`);
        return { status: 'unavailable' };
      });
  }
}

export const memerClient = new Memer();
