export interface IBranch {
  id: string;
  name: string;
  repositoryId: string;
  created: string;
  status?: 'label-accent' | 'label-primary' | 'label-danger';
}

export interface IRepositoryComment {
  id: string;
  text: string;
  userId: string;
  userName: string;
  created: string;
}

export interface IRepository {
  id: string;
  name: string;
  branches: Array<IBranch>;
  comments: Array<IRepositoryComment>;
  lastUpdated?: string;
}
