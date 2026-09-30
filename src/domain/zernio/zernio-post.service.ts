import type {
  ICreateZernioPostInput,
  IUpdateZernioPostInput,
  IZernioPost,
} from "@/domain/zernio/zernio.types";

export interface IZernioPostService {
  createPost(input: ICreateZernioPostInput): Promise<IZernioPost>;
  getPost(postId: string): Promise<IZernioPost | null>;
  updatePost(input: IUpdateZernioPostInput): Promise<IZernioPost>;
  cancelPost(postId: string): Promise<void>;
}
