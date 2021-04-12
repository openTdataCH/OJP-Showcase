import { DOM_Helpers } from './../helpers/DOM_Helpers'

export default class Progress_Controller {
    private progress_status_el: HTMLElement

    constructor() {
        const el_id = 'app-progress';
        this.progress_status_el = document.getElementById(el_id) as HTMLElement;
    }

    public setIdle() {
        DOM_Helpers.removeClassName(this.progress_status_el, 'bg-primary progress-bar-striped progress-bar-animated');
        DOM_Helpers.addClassName(this.progress_status_el, 'bg-success');
        this.progress_status_el.innerText = 'Idle';
    }

    public setBusy(message: string) {
        DOM_Helpers.removeClassName(this.progress_status_el, 'bg-success');
        DOM_Helpers.addClassName(this.progress_status_el, 'bg-primary progress-bar-striped progress-bar-animated');
        this.progress_status_el.innerText = message;
    }

    public setError(message: string) {
        DOM_Helpers.removeClassName(this.progress_status_el, 'bg-primary progress-bar-striped progress-bar-animated');
        DOM_Helpers.addClassName(this.progress_status_el, 'bg-danger');
        this.progress_status_el.innerText = message;
    }
}