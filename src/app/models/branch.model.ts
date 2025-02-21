export interface IBranch {
  id: string;
  name: string;
  repositoryId: string;
  created: string;
  status?: 'label-accent' | 'label-primary' | 'label-danger';
}

export interface IRepository {
  id: string;
  name: string;
  branches: Array<IBranch>;
  lastUpdated?: string;
}
