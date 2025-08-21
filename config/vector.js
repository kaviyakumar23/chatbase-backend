import { Pinecone } from '@pinecone-database/pinecone';

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

const getIndex = () => {
  return pinecone.index(process.env.PINECONE_INDEX_NAME);
};

export {
  pinecone,
  getIndex
};