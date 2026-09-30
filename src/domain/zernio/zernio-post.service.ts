import type {
  ICreateZernioPostInput,
  IZernioPost,
} from "@/domain/zernio/zernio.types";

export interface IZernioPostService {
  createPost(input: ICreateZernioPostInput): Promise<IZernioPost>;
  getPost(postId: string): Promise<IZernioPost | null>;
  cancelPost(postId: string): Promise<void>;
}
