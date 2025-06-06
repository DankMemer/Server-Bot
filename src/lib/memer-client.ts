import axios from 'axios';
import { CONFIG } from '../config';

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

  public async getUser(id: string): Promise<MemerUser> {
    return axios(`${CONFIG.memer.apiUrl}/currency/inspect/user/${id}/main`, {
      headers: {
        Authorization: CONFIG.memer.token,
      },
    })
      .then(response => response.data)
      .catch(() => null);
  }
}

export const memerClient = new Memer();
