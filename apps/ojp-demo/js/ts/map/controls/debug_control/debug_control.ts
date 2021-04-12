import mapboxgl from 'mapbox-gl'

export default class DebugController implements mapboxgl.IControl {
    private map?: mapboxgl.Map | null;
    private container?: HTMLElement | null;

    private debug_center_el?: HTMLElement | null;
    private debug_zoom_el?: HTMLElement | null;

    constructor() {
        this.map = null;
        this.container = null;

        this.debug_center_el = null;
        this.debug_zoom_el = null;
    }

    onAdd(map: mapboxgl.Map): HTMLElement {
        this.map = map;

        this.container = document.createElement('div');
        this.container.className = 'mapboxgl-ctrl mapboxgl-ctrl-group map-control';
        
        this.container.innerHTML = (document.getElementById('debug_control') as HTMLElement).innerHTML;

        map.on('move', () => {
            this.updateDebugCenter();
        });

        map.on('zoom', () => {
            this.updateDebugZoom();
        });

        // HACK - the DOM IDs are not ready yet
        setTimeout(() => {
            this.debug_center_el = document.getElementById('map_debug_center');
            this.debug_zoom_el = document.getElementById('map_debug_zoom');

            this.updateDebugZoom();
            this.updateDebugCenter();
        }, 200);
        
        return this.container;
    }

    onRemove() {
        this.map = null;
        this.container = null;
    }

    private updateDebugZoom() {
        if (!(this.map && this.debug_zoom_el)) {
            return;
        }

        this.debug_zoom_el!.innerText = this.map!.getZoom().toFixed(2).toString();
    }

    private updateDebugCenter() {
        if (!(this.map && this.debug_center_el)) {
            return;
        }

        const coords_array = this.map!.getCenter().toArray().map((coord) => {
            return coord.toFixed(6);
        });
        this.debug_center_el!.innerText = coords_array.join(',');
    }
}