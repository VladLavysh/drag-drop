// Types
type ProjectType = {
  id: string | number,
  title: string,
  description: string,
  people: number
}

// Project State Management
class ProjectState {
  private listeners: any[] = []
  private projects: ProjectType[] = []
  private static instance: ProjectState

  // Cannot create objects
  private constructor() { }

  static getInstance() {
    if (!ProjectState.instance) {
      ProjectState.instance = new ProjectState()
    }

    return ProjectState.instance
  }

  addListener(listenerFn: Function) {
    this.listeners.push(listenerFn)
  }

  addProject(title: string, description: string, people: number) {
    const newProject = {
      id: Date.now().toString(),
      title,
      description,
      people
    }

    this.projects.push(newProject)

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

// ProjectList class
class ProjectList {
  private templateElement: HTMLTemplateElement
  private hostElement: HTMLDivElement
  private element: HTMLElement
  private assignedProjects: any[]

  constructor(private type: 'active' | 'finished') {
    this.templateElement = document.getElementById('project-list') as HTMLTemplateElement
    this.hostElement = document.getElementById('app') as HTMLDivElement
    this.assignedProjects = []

    this.element = document
      .importNode(this.templateElement.content, true)
      .firstElementChild as HTMLElement
    this.element.id = `${this.type}-projects`

    state.addListener((projects: any[]) => {
      this.assignedProjects = projects
      this.renderProjects()
    })

    this.attach()
    this.renderContent()
  }

  private renderProjects() {
    const listEl = document.getElementById(`${this.type}-projects-list`) as HTMLUListElement

    for (const prjItem of this.assignedProjects) {
      const listItem = document.createElement('li')
      listItem.textContent = prjItem.title
      listEl.appendChild(listItem)
    }
  }

  private renderContent() {
    const listId = `${this.type}-projects-list`

    this.element.querySelector('ul')!.id = listId
    this.element.querySelector('h2')!.textContent = this.type.toUpperCase() + ' PROJECTS'
  }

  private attach() {
    this.hostElement.insertAdjacentElement('beforeend', this.element)
  }
}

// ProjectInput class
class ProjectInput {
  private templateElement: HTMLTemplateElement
  private hostElement: HTMLDivElement
  private element: HTMLFormElement
  private titleInputElement: HTMLInputElement
  private descriptionInputElement: HTMLInputElement
  private peopleInputElement: HTMLInputElement

  constructor() {
    this.templateElement = document.getElementById('project-input') as HTMLTemplateElement
    this.hostElement = document.getElementById('app') as HTMLDivElement

    this.element = document
      .importNode(this.templateElement.content, true)
      .firstElementChild as HTMLFormElement
    this.element.id = 'user-input'

    this.titleInputElement = this.element.querySelector('#title') as HTMLInputElement
    this.descriptionInputElement = this.element.querySelector('#description') as HTMLInputElement
    this.peopleInputElement = this.element.querySelector('#people') as HTMLInputElement

    this.configure()
    this.attach()
  }

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

  private configure() {
    // Decorator Autobind  or this.submitHandler.bind(this)
    this.element.addEventListener('submit', this.submitHandler)
  }

  private attach() {
    this.hostElement.insertAdjacentElement('afterbegin', this.element)
  }
}


const prjInput = new ProjectInput();
const activePrjList = new ProjectList('active')
const finishedPrjList = new ProjectList('finished')

