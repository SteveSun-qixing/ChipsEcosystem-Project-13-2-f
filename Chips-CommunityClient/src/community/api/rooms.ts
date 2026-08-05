import { apiClient } from "./client";
import type { CardSummary, BoxSummary } from "./content";
import type { PublicUserProfile } from "./auth";

export interface Room {
  id: string;
  userId: string;
  name: string;
  slug: string;
  description: string | null;
  coverUrl: string | null;
  visibility: "public" | "private";
  cardCount: number;
  boxCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface RoomContents {
  cards: CardSummary[];
  boxes: BoxSummary[];
}

export const roomsApi = {
  async create(data: { name: string; description?: string; visibility?: "public" | "private" }) {
    const res = await apiClient.post<{ data: Room }>("/rooms", data);
    return res.data;
  },

  async getUserRooms(username: string) {
    const res = await apiClient.get<{ data: Room[] }>(`/users/${username}/rooms`);
    return res.data;
  },

  async getRoom(roomId: string) {
    const res = await apiClient.get<{ data: Room }>(`/rooms/${roomId}`);
    return res.data;
  },

  async updateRoom(
    roomId: string,
    patch: { name?: string; description?: string; visibility?: "public" | "private" },
  ) {
    const res = await apiClient.patch<{ data: Room }>(`/rooms/${roomId}`, patch);
    return res.data;
  },

  async deleteRoom(roomId: string) {
    await apiClient.delete(`/rooms/${roomId}`);
  },

  async getRoomContents(roomId: string) {
    const res = await apiClient.get<{ data: RoomContents }>(`/rooms/${roomId}/contents`);
    return res.data;
  },

  async uploadCover(roomId: string, file: File) {
    const fd = new FormData();
    fd.append("file", file);
    return apiClient.upload<{ data: { coverUrl: string } }>(`/rooms/${roomId}/cover`, fd);
  },
};

export const spaceApi = {
  async getUserSpace(username: string) {
    const res = await apiClient.get<{
      data: {
        user: PublicUserProfile;
        isOwner: boolean;
        rooms: Room[];
        rootCards: CardSummary[];
        rootBoxes: BoxSummary[];
      };
    }>(`/users/${username}/space`);
    return res.data;
  },
};
