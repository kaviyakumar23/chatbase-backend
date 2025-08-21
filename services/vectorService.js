import { getIndex } from '../config/vector.js';

class VectorService {
  constructor() {
    this.index = getIndex();
  }
  
  async upsertVectors(vectors) {
    const response = await this.index.upsert(vectors);
    return response;
  }
  
  async queryVectors(vector, topK = 10, includeMetadata = true, includeValues = false, filter = {}) {
    const response = await this.index.query({
      vector,
      topK,
      includeMetadata,
      includeValues,
      filter: Object.keys(filter).length > 0 ? filter : undefined
    });
    
    return response;
  }
  
  async queryById(id, topK = 10, includeMetadata = true, includeValues = false, filter = {}) {
    const response = await this.index.query({
      id,
      topK,
      includeMetadata,
      includeValues,
      filter: Object.keys(filter).length > 0 ? filter : undefined
    });
    
    return response;
  }
  
  async fetchVectors(ids) {
    const response = await this.index.fetch(ids);
    return response;
  }
  
  async deleteVectors(ids) {
    const response = await this.index.deleteMany(ids);
    return response;
  }
  
  async deleteByFilter(filter) {
    const response = await this.index.deleteMany({
      filter
    });
    return response;
  }
  
  async getIndexStats() {
    const response = await this.index.describeIndexStats();
    return response;
  }
  
  async updateVector(id, values, metadata = {}) {
    const response = await this.index.update({
      id,
      values,
      setMetadata: metadata
    });
    return response;
  }
  
  formatVectorForUpsert(id, values, metadata = {}) {
    return {
      id: id.toString(),
      values,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString()
      }
    };
  }
  
  async batchUpsert(vectors, batchSize = 100) {
    const batches = [];
    for (let i = 0; i < vectors.length; i += batchSize) {
      batches.push(vectors.slice(i, i + batchSize));
    }
    
    const results = [];
    for (const batch of batches) {
      const result = await this.upsertVectors(batch);
      results.push(result);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return results;
  }
}

export default new VectorService();