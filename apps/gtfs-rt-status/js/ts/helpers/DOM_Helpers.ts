export class DOM_Helpers {
    static addClassName(dom_node: HTMLElement, input_class_name: string) {
        const input_class_names = input_class_name.split(' ');

        input_class_names.forEach(class_name => {
            const class_names = dom_node.className.split(' ');
            const class_name_idx = class_names.indexOf(class_name);
            const has_class_name = class_name_idx !== -1;

            if (has_class_name) {
                return;
            }

            class_names.push(class_name);
            dom_node.className = class_names.join(' ');
        });
    }

    static removeClassName(dom_node: HTMLElement, input_class_name: string) {
        const input_class_names = input_class_name.split(' ');

        input_class_names.forEach(class_name => {
            const class_names = dom_node.className.split(' ');
            const class_name_idx = class_names.indexOf(class_name);
            const has_class_name = class_name_idx !== -1;
    
            if (!has_class_name) {
                return;
            }
    
            class_names.splice(class_name_idx, 1);
            dom_node.className = class_names.join(' ');
        });
    }

    static hasClassName(el: HTMLElement, class_name: string) {
        const has_class_name = el.className.indexOf(class_name) !== -1;
        return has_class_name;
    }
}