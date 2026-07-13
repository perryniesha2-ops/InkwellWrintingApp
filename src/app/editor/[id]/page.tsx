import { EditorPage } from "@/components/editor/EditorPage";

type PageProps = {
  params: { id: string } | Promise<{ id: string }>;
};

async function unwrapParams<T>(p: T | Promise<T>): Promise<T> {
  return await Promise.resolve(p);
}

export default async function Editor({ params }: PageProps) {
  const { id } = await unwrapParams(params);
  return <EditorPage id={id} />;
}
