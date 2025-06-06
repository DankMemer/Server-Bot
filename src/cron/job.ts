export abstract class Job {
  public abstract interval: string;

  public abstract execute(): any;
}
