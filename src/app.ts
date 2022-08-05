// Drag & Drop Interfaces
interface Draggable {
  dragStartHandler(event: DragEvent): void
  dragEndHandler(event: DragEvent): void
}

interface DragTarget {
  dragOverHandler(event: DragEvent): void
  dropHandler(event: DragEvent): void
  dragLeaveHandler(event: DragEvent): void
}

// Project Type
enum ProjectStatus { Active, Finished }

class Project {
  constructor(
    public id: string,
    public title: string,
    public description: string,
    public people: number,
    public status: ProjectStatus
  ) { }
}

// Project State Management
type Listener<T> = (items: T[]) => void

class State<T> {
  protected listeners: Listener<T>[] = []

  addListener(listenerFn: Listener<T>) {
    this.listeners.push(listenerFn)
  }
}

class ProjectState extends State<Project>{
  private projects: Project[] = []
  private static instance: ProjectState

  // Cannot create objects
  private constructor() { super() }

  static getInstance() {
    if (!ProjectState.instance) {
      ProjectState.instance = new ProjectState()
    }

    return ProjectState.instance
  }

  addProject(title: string, description: string, people: number) {
    const newProject = new Project(
      Date.now().toString(),
      title,
      description,
      people,
      ProjectStatus.Active
    )

    this.projects.push(newProject)

    this.updateListeners()
  }

  moveProject(projectId: string, newStatus: ProjectStatus) {
    const project = this.projects.find(el => el.id === projectId)

    if (project && project.status !== newStatus) {
      project.status = newStatus
      this.updateListeners()
    }
  }

  private updateListeners() {
    for (const listenerFn of this.listeners) {
      listenerFn([...this.projects])
    }
  }
}

const state = ProjectState.getInstance()

// Autobind decorator
function Autobind(_: any, _2: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value
  const adjDescriptor: PropertyDescriptor = {
    configurable: true,
    get() {
      const boundFn = originalMethod.bind(this)
      return boundFn
    }
  }

  return adjDescriptor
}

// Validation
interface Validatable {
  value: string | number,
  required: boolean,
  minLength?: number,
  maxLength?: number,
  min?: number,
  max?: number,
}

function validate(validatableInput: Validatable) {
  let isValid = true

  // Required
  if (validatableInput.required) {
    isValid = isValid && validatableInput.value.toString().trim().length !== 0
  }

  // MinLength
  if (validatableInput.minLength != null && typeof validatableInput.value === 'string') {
    isValid = isValid && validatableInput.value.length >= validatableInput.minLength
  }

  // MaxLength
  if (validatableInput.maxLength != null && typeof validatableInput.value === 'string') {
    isValid = isValid && validatableInput.value.length <= validatableInput.maxLength
  }

  // Min (number)
  if (validatableInput.min != null && typeof validatableInput.value === 'number') {
    isValid = isValid && validatableInput.value >= validatableInput.min
  }

  // Max (number)
  if (validatableInput.max != null && typeof validatableInput.value === 'number') {
    isValid = isValid && validatableInput.value <= validatableInput.max
  }

  return isValid
}

// Component base class
abstract class Component<T extends HTMLElement, R extends HTMLElement> {
  templateElement: HTMLTemplateElement
  hostElement: T
  element: R

  constructor(templateId: string, hostElementId: string, insertPosition: string, newElementId?: string) {
    this.templateElement = document.getElementById(templateId) as HTMLTemplateElement
    this.hostElement = document.getElementById(hostElementId) as T

    this.element = document
      .importNode(this.templateElement.content, true)
      .firstElementChild as R

    if (newElementId) {
      this.element.id = newElementId
    }

    this.attach(insertPosition)
  }

  private attach(insertPlace: string) {
    // afterbegin, beforeend
    this.hostElement.insertAdjacentElement(insertPlace as InsertPosition, this.element)
  }

  abstract configure(): void
  abstract renderContent(): void
}

// ProjectItem class
class ProjectItem extends Component<HTMLUListElement, HTMLLIElement> implements Draggable {
  private project: Project

  constructor(hostId: string, project: Project) {
    super('single-project', hostId, 'beforeend', project.id)
    this.project = project

    this.configure()
    this.renderContent()
  }

  get persons() {
    return this.project.people === 1
      ? '1 person'
      : `${this.project.people} persons`
  }

  configure(): void {
    this.element.addEventListener('dragstart', this.dragStartHandler)
    this.element.addEventListener('dragend', this.dragEndHandler)
  }

  @Autobind
  dragStartHandler(event: DragEvent): void {
    event.dataTransfer!.setData('text/plain', this.project.id)
    event.dataTransfer!.effectAllowed = 'move'
  }

  // @Autobind
  dragEndHandler(_: DragEvent): void {
    console.log('DragEnd');
  }

  renderContent(): void {
    this.element.querySelector('h2')!.textContent = this.project.title
    this.element.querySelector('h3')!.textContent = this.persons + ' assigned.'
    this.element.querySelector('p')!.textContent = this.project.description
  }
}

// ProjectList class
class ProjectList extends Component<HTMLDivElement, HTMLElement> implements DragTarget {
  private assignedProjects: Project[]

  constructor(private type: 'active' | 'finished') {
    super('project-list', 'app', 'beforeend', `${type}-projects`)

    this.assignedProjects = []

    this.configure()
    this.renderContent()
  }

  configure(): void {
    this.element.addEventListener('dragover', this.dragOverHandler)
    this.element.addEventListener('dragleave', this.dragLeaveHandler)
    this.element.addEventListener('drop', this.dropHandler)

    state.addListener((projects: Project[]) => {
      this.assignedProjects = projects.filter(prj => {
        return this.type === 'active'
          ? prj.status === ProjectStatus.Active
          : prj.status === ProjectStatus.Finished
      })

      this.renderProjects()
    })
  }

  @Autobind
  dragOverHandler(event: DragEvent): void {
    if (event.dataTransfer && event.dataTransfer.types[0] === 'text/plain') {
      event.preventDefault()
      const listEl = this.element.querySelector('ul')!
      listEl.classList.add('droppable')
    }
  }

  @Autobind
  dragLeaveHandler(_: DragEvent): void {
    const listEl = this.element.querySelector('ul')!
    listEl.classList.remove('droppable')
  }

  @Autobind
  dropHandler(event: DragEvent): void {
    const projectId = event.dataTransfer!.getData('text/plain')
    const newStatus = this.type === 'active' ? ProjectStatus.Active : ProjectStatus.Finished

    state.moveProject(projectId, newStatus)
  }

  renderContent(): void {
    const listId = `${this.type}-projects-list`

    this.element.querySelector('ul')!.id = listId
    this.element.querySelector('h2')!.textContent = this.type.toUpperCase() + ' PROJECTS'
  }

  private renderProjects() {
    const listEl = document.getElementById(`${this.type}-projects-list`) as HTMLUListElement
    listEl.innerHTML = ''

    for (const prjItem of this.assignedProjects) {
      new ProjectItem(this.element.querySelector('ul')!.id, prjItem)
    }
  }
}

// ProjectInput class
class ProjectInput extends Component<HTMLDivElement, HTMLFormElement> {
  private titleInputElement: HTMLInputElement
  private descriptionInputElement: HTMLInputElement
  private peopleInputElement: HTMLInputElement

  constructor() {
    super('project-input', 'app', 'afterbegin', 'user-input')

    this.titleInputElement = this.element.querySelector('#title') as HTMLInputElement
    this.descriptionInputElement = this.element.querySelector('#description') as HTMLInputElement
    this.peopleInputElement = this.element.querySelector('#people') as HTMLInputElement

    this.configure()
  }

  configure(): void {
    // Decorator Autobind  or this.submitHandler.bind(this)
    this.element.addEventListener('submit', this.submitHandler)
  }

  renderContent(): void { }

  private gatherUserInput(): [string, string, number] | void {
    const title = this.titleInputElement.value
    const description = this.descriptionInputElement.value
    const people = +this.peopleInputElement.value

    const titleValid: Validatable = {
      value: title,
      required: true
    }
    const describeValid: Validatable = {
      value: description,
      required: true,
      minLength: 5
    }
    const peopleValid: Validatable = {
      value: people,
      required: true,
      min: 1,
      max: 5
    }

    // If ALL fields are NOT valid
    if (!validate(titleValid) || !validate(describeValid) || !validate(peopleValid)) {
      // Code for invalid case
      alert('Wrong input')
      return
    }

    return [title, description, people]
  }

  private clearInputs() {
    this.titleInputElement.value =
      this.descriptionInputElement.value =
      this.peopleInputElement.value = ''
  }

  @Autobind
  private submitHandler(event: Event) {
    event.preventDefault()

    const userInput = this.gatherUserInput()
    if (Array.isArray(userInput)) {
      const [title, description, people] = userInput
      state.addProject(title, description, people)
      this.clearInputs()
    }
  }
}

// Implementation
const prjInput = new ProjectInput();
const activePrjList = new ProjectList('active')
const finishedPrjList = new ProjectList('finished')

//console.log(prjInput, activePrjList, finishedPrjList);
