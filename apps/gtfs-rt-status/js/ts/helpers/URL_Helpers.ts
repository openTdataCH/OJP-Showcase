export class URL_Helpers {
    public static dict_to_querystring(qs_params_dict: any) {
        var qsParts: string[] = [];
        for (var key in qs_params_dict) {
            if (qs_params_dict.hasOwnProperty(key)) {
                const value = qs_params_dict[key];
                const qsPart = encodeURIComponent(key) + '=' + encodeURIComponent(value);
                qsParts.push(qsPart);
            }
        }

        return qsParts.join('&');
    }
}