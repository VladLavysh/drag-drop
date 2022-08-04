import { ProjectInput, ProjectList } from "./project";

const prjInput = new ProjectInput();
const activePrjList = new ProjectList('active')
const finishedPrjList = new ProjectList('finished')

console.log(prjInput, activePrjList, finishedPrjList);
