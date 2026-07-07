import { StoryBiblePage } from "@/components/bible/StoryBible";

type PageProps = {
  params: { id: string } | Promise<{ id: string }>;
};

async function unwrapParams<T>(p: T | Promise<T>): Promise<T> {
  return await Promise.resolve(p);
}

export default async function BiblePage({ params }: PageProps) {
  const { id } = await unwrapParams(params);
  return <StoryBiblePage id={id} />;
}
