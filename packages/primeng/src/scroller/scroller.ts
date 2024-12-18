import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
    AfterContentInit,
    AfterViewChecked,
    ChangeDetectionStrategy,
    Component,
    computed,
    contentChild,
    contentChildren,
    effect,
    ElementRef,
    inject,
    input,
    NgModule,
    NgZone,
    OnDestroy,
    OnInit,
    output,
    signal,
    SimpleChanges,
    TemplateRef,
    viewChild,
    ViewEncapsulation,
    WritableSignal
} from '@angular/core';
import { findSingle, getHeight, getWidth, isTouchDevice, isVisible } from '@primeuix/utils';
import { PrimeTemplate, ScrollerOptions, SharedModule } from 'primeng/api';
import { BaseComponent } from 'primeng/basecomponent';
import { SpinnerIcon } from 'primeng/icons';
import { Nullable, VoidListener } from 'primeng/ts-helpers';
import { ScrollerLazyLoadEvent, ScrollerScrollEvent, ScrollerScrollIndexChangeEvent, ScrollerToType } from './scroller.interface';
import { ScrollerStyle } from './style/scrollerstyle';

/**
 * Scroller is a performance-approach to handle huge data efficiently.
 * @group Components
 */
@Component({
    selector: 'p-scroller, p-virtualscroller, p-virtual-scroller, p-virtualScroller',
    imports: [CommonModule, SpinnerIcon, SharedModule],
    standalone: true,
    template: `
        @if (!disabled$$()) {
            <div
                #element
                [attr.id]="id$$()"
                [attr.tabindex]="tabindex$$()"
                [ngStyle]="style$$()"
                [class]="styleClass$$()"
                [ngClass]="{
                    'p-virtualscroller': true,
                    'p-virtualscroller-inline': inline$$(),
                    'p-virtualscroller-both p-both-scroll': both$$(),
                    'p-virtualscroller-horizontal p-horizontal-scroll': horizontal$$()
                }"
                (scroll)="onContainerScroll($event)"
                [attr.data-pc-name]="'scroller'"
                [attr.data-pc-section]="'root'"
            >
                @if (contentTemplate$$() || _contentTemplate$$()) {
                    <ng-container *ngTemplateOutlet="contentTemplate$$() || _contentTemplate$$(); context: { $implicit: loadedItems$$(), options: contentOptions$$() }"></ng-container>
                } @else {
                    <div #content class="p-virtualscroller-content" [ngClass]="{ 'p-virtualscroller-loading ': d_loading$$() }" [ngStyle]="contentStyle$$()" [attr.data-pc-section]="'content'">
                        <!-- @for (item of loadedItems$$(); track getTrackFn($index, item); let index = $index) {
                            <ng-container *ngTemplateOutlet="itemTemplate$$() || _itemTemplate$$(); context: { $implicit: item, options: getOptions(index) }"></ng-container>
                        } -->
                        <!-- TODO: How to use trackBy function in a @for track? -->
                        <ng-container *ngFor="let item of loadedItems$$(); let index = index; trackBy: trackBy$$()">
                            <ng-container *ngTemplateOutlet="itemTemplate$$() || _itemTemplate$$(); context: { $implicit: item, options: getOptions(index) }"></ng-container>
                        </ng-container>
                    </div>
                }
                @if (showSpacer$$()) {
                    <div class="p-virtualscroller-spacer" [ngStyle]="spacerStyle$$()" [attr.data-pc-section]="'spacer'"></div>
                }
                @if (!loaderDisabled$$() && showLoader$$() && d_loading$$()) {
                    <div class="p-virtualscroller-loader" [ngClass]="{ 'p-virtualscroller-loader-mask': !loaderTemplate$$() }" [attr.data-pc-section]="'loader'">
                        @if (loaderTemplate$$() || _loaderTemplate$$()) {
                            @for (item of loaderArr$$(); track $index; let index = $index) {
                                <ng-container
                                    *ngTemplateOutlet="
                                        loaderTemplate$$() || _loaderTemplate$$();
                                        context: {
                                            options: getLoaderOptions(index, both$$() && { numCols: numItemsInViewport$$().cols })
                                        }
                                    "
                                ></ng-container>
                            }
                        } @else if (loaderIconTemplate$$() || _loaderIconTemplate$$()) {
                            <ng-container *ngTemplateOutlet="loaderIconTemplate$$() || _loaderIconTemplate$$(); context: { options: { styleClass: 'p-virtualscroller-loading-icon' } }"></ng-container>
                        } @else {
                            <SpinnerIcon [styleClass]="'p-virtualscroller-loading-icon pi-spin'" [attr.data-pc-section]="'loadingIcon'" />
                        }
                    </div>
                }
            </div>
        } @else {
            <ng-content></ng-content>
            @if (contentTemplate$$() || _contentTemplate$$()) {
                <ng-container *ngTemplateOutlet="contentTemplate$$() || _contentTemplate$$(); context: { $implicit: items$$(), options: { rows: items$$(), columns: loadedColumns$$() } }"></ng-container>
            }
        }
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    providers: [ScrollerStyle]
})
export class Scroller extends BaseComponent implements OnInit, AfterContentInit, AfterViewChecked, OnDestroy {
    /**
     * Unique identifier of the element.
     * @group Props
     */
    id$$ = input<string | undefined>(undefined, { alias: 'id' });
    /**
     * Inline style of the component.
     * @group Props
     */
    style$$ = input<{ [klass: string]: any } | null | undefined>(undefined, { alias: 'style' });
    /**
     * Style class of the element.
     * @group Props
     */
    styleClass$$ = input<string | undefined>(undefined);
    /**
     * Index of the element in tabbing order.
     * @group Props
     */
    tabindex$$ = input<number>(0, { alias: 'tabindex' });
    /**
     * An array of objects to display.
     * @group Props
     */
    items$$ = input<any[] | undefined | null>(undefined, { alias: 'items' });

    /**
     * The height/width of item according to orientation.
     * @group Props
     */
    itemSize$$ = input<number[] | number>(0, { alias: 'itemSize' });
    /**
     * Height of the scroll viewport.
     * @group Props
     */
    scrollHeight$$ = input<string | undefined>(undefined, { alias: 'scrollHeight' });
    /**
     * Width of the scroll viewport.
     * @group Props
     */
    scrollWidth$$ = input<string | undefined>(undefined, { alias: 'scrollWidth' });
    /**
     * The orientation of scrollbar.
     * @group Props
     */
    orientation$$ = input<'vertical' | 'horizontal' | 'both'>('vertical', { alias: 'orientation' });
    /**
     * Used to specify how many items to load in each load method in lazy mode.
     * @group Props
     */
    step$$ = input<number>(0, { alias: 'step' });
    /**
     * Delay in scroll before new data is loaded.
     * @group Props
     */
    delay$$ = input<number>(0, { alias: 'delay' });
    /**
     * Delay after window's resize finishes.
     * @group Props
     */
    resizeDelay$$ = input<number>(10, { alias: 'resizeDelay' });
    /**
     * Used to append each loaded item to top without removing any items from the DOM. Using very large data may cause the browser to crash.
     * @group Props
     */
    appendOnly$$ = input<boolean>(false, { alias: 'appendOnly' });
    /**
     * Specifies whether the scroller should be displayed inline or not.
     * @group Props
     */
    inline$$ = input<boolean>(false, { alias: 'inline' });
    /**
     * Defines if data is loaded and interacted with in lazy manner.
     * @group Props
     */
    lazy$$ = input<boolean>(false, { alias: 'lazy' });
    /**
     * If disabled, the scroller feature is eliminated and the content is displayed directly.
     * @group Props
     */
    disabled$$ = input<boolean>(false, { alias: 'disabled' });
    /**
     * Used to implement a custom loader instead of using the loader feature in the scroller.
     * @group Props
     */
    loaderDisabled$$ = input<boolean>(false, { alias: 'loaderDisabled' });
    /**
     * Columns to display.
     * @group Props
     */
    columns$$ = input<any[] | undefined | null>(undefined, { alias: 'columns' });
    /**
     * Used to implement a custom spacer instead of using the spacer feature in the scroller.
     * @group Props
     */
    showSpacer$$ = input<boolean>(true, { alias: 'showSpacer' });
    /**
     * Defines whether to show loader.
     * @group Props
     */
    showLoader$$ = input<boolean>(false, { alias: 'showLoader' });
    /**
     * Determines how many additional elements to add to the DOM outside of the view. According to the scrolls made up and down, extra items are added in a certain algorithm in the form of multiples of this number. Default value is half the number of items shown in the view.
     * @group Props
     */
    numToleratedItems$$ = input<number | any>(undefined, { alias: 'numToleratedItems' }); // TODO: Can it just be number and not any?
    /**
     * Defines whether the data is loaded.
     * @group Props
     */
    loading$$ = input<boolean | undefined>(undefined, { alias: 'loading' });
    /**
     * Defines whether to dynamically change the height or width of scrollable container.
     * @group Props
     */
    autoSize$$ = input<boolean>(false, { alias: 'autoSize' });
    /**
     * Function to optimize the dom operations by delegating to ngForTrackBy, default algoritm checks for object identity.
     * @group Props
     */
    trackBy$$ = input<any>(undefined, { alias: 'trackBy' }); // TODO: Consider typing this stronger and improve compatability with @for track
    /**
     * Defines whether to use the scroller feature. The properties of scroller component can be used like an object in it.
     * @group Props
     */
    options$$ = input<ScrollerOptions | undefined>(undefined, { alias: 'options' });
    /**
     * Callback to invoke in lazy mode to load new data.
     * @param {ScrollerLazyLoadEvent} event - Custom lazy load event.
     * @group Emits
     */
    onLazyLoad = output<ScrollerLazyLoadEvent>();
    /**
     * Callback to invoke when scroll position changes.
     * @param {ScrollerScrollEvent} event - Custom scroll event.
     * @group Emits
     */
    onScroll = output<ScrollerScrollEvent>();
    /**
     * Callback to invoke when scroll position and item's range in view changes.
     * @param {ScrollerScrollEvent} event - Custom scroll index change event.
     * @group Emits
     */
    onScrollIndexChange = output<ScrollerScrollIndexChangeEvent>();

    elementViewChild$$ = viewChild<Nullable<ElementRef>>('element');

    contentViewChild$$ = viewChild<Nullable<ElementRef>>('content');

    d_loading$$ = signal(false);

    d_numToleratedItems$$ = signal<any>(undefined);

    contentEl$$ = signal<any>(undefined);
    /**
     * Content template of the component.
     * @group Templates
     */
    contentTemplate$$ = contentChild<Nullable<TemplateRef<any>>>('content', { descendants: false });

    /**
     * Item template of the component.
     * @group Templates
     */
    itemTemplate$$ = contentChild<Nullable<TemplateRef<any>>>('item', { descendants: false });
    /**
     * Loader template of the component.
     * @group Templates
     */
    loaderTemplate$$ = contentChild<Nullable<TemplateRef<any>>>('loader', { descendants: false });

    /**
     * Loader icon template of the component.
     * @group Templates
     */
    loaderIconTemplate$$ = contentChild<Nullable<TemplateRef<any>>>('loadericon', { descendants: false });

    templates$$ = contentChildren(PrimeTemplate);

    _contentTemplate$$ = signal<TemplateRef<any> | undefined>(undefined);

    _itemTemplate$$ = signal<TemplateRef<any> | undefined>(undefined);

    _loaderTemplate$$ = signal<TemplateRef<any> | undefined>(undefined);

    _loaderIconTemplate$$ = signal<TemplateRef<any> | undefined>(undefined);

    first$$ = signal<any | number | { rows: number; cols: number }>(0);

    last$$ = signal<any | number | { rows: number; cols: number }>(0);

    page$$ = signal(0);

    isRangeChanged$$ = signal(false);

    numItemsInViewport$$ = signal<any | number | { rows: number; cols: number }>(0);

    lastScrollPos$$ = signal<any | number | { top: number; left: number }>(0);

    lazyLoadState$$ = signal<any | { first: number; last: number } | { first: { rows: number; cols: number }; last: { rows: number; cols: number } }>({});

    loaderArr$$ = signal<any[]>([]);

    spacerStyle$$ = signal<{ [klass: string]: any } | null | undefined>({});

    contentStyle$$ = signal<{ [klass: string]: any } | null | undefined>({});

    scrollTimeout?: ReturnType<typeof setTimeout>;

    resizeTimeout?: ReturnType<typeof setTimeout>;

    initialized: boolean = false;

    windowResizeListener: VoidListener;

    defaultWidth: number | undefined;

    defaultHeight: number | undefined;

    defaultContentWidth: number | undefined;

    defaultContentHeight: number | undefined;

    vertical$$ = computed(() => this.orientation$$() === 'vertical');

    horizontal$$ = computed(() => this.orientation$$() === 'horizontal');

    both$$ = computed(() => this.orientation$$() === 'both');

    loadedItems$$ = computed(() => {
        const items = this.items$$();
        const d_loading = this.d_loading$$();
        const both = this.both$$();
        const appendOnly = this.appendOnly$$();
        const first = this.first$$();
        const last = this.last$$();
        const columns = this.columns$$();
        const horizontal = this.horizontal$$();
        if (items && !d_loading) {
            if (both) return items.slice(appendOnly ? 0 : first.rows, last.rows).map((item) => (columns ? item : item.slice(appendOnly ? 0 : first.cols, last.cols)));
            else if (horizontal && columns) return items;
            else return items.slice(appendOnly ? 0 : first, last);
        }

        return [];
    });

    loadedRows$$ = computed(() => {
        const d_loading = this.d_loading$$();
        const loaderDisabled = this.loaderDisabled$$();
        const loaderArr = this.loaderArr$$();
        const loadedItems = this.loadedItems$$();
        return d_loading ? (loaderDisabled ? loaderArr : []) : loadedItems;
    });

    loadedColumns$$ = computed(() => {
        const columns = this.columns$$();
        const both = this.both$$();
        const horizontal = this.horizontal$$();
        const d_loading = this.d_loading$$();
        const loaderDisabled = this.loaderDisabled$$();
        const loaderArr = this.loaderArr$$();
        const first = this.first$$();
        const last = this.last$$();

        if (columns && (both || horizontal)) {
            return d_loading && loaderDisabled ? (both ? loaderArr[0] : loaderArr) : columns.slice(both ? this.first$$().cols : first, both ? last.cols : last);
        }

        return columns;
    });

    _componentStyle = inject(ScrollerStyle);

    constructor(private zone: NgZone) {
        super();
        effect(() => {
            const options = this.options$$();
            if (options && typeof options === 'object') {
                Object.entries(options).forEach(([k, v]) => {
                    if (`${k}$$` in this) {
                        const key$$ = this[`${k}$$`] as WritableSignal<any>;
                        if (key$$() !== v) {
                            key$$.set(v);
                        }
                    }
                });
            }
        });
    }

    ngOnInit() {
        super.ngOnInit();
        this.setInitialState();
    }

    ngOnChanges(simpleChanges: SimpleChanges) {
        super.ngOnChanges(simpleChanges);
        let isLoadingChanged = false;

        if (simpleChanges.loading) {
            const { previousValue, currentValue } = simpleChanges.loading;

            if (this.lazy$$() && previousValue !== currentValue && currentValue !== this.d_loading$$()) {
                this.d_loading$$.set(currentValue);
                isLoadingChanged = true;
            }
        }

        if (simpleChanges.orientation) {
            this.lastScrollPos$$.set(this.both$$() ? { top: 0, left: 0 } : 0);
        }

        if (simpleChanges.numToleratedItems) {
            const { previousValue, currentValue } = simpleChanges.numToleratedItems;

            if (previousValue !== currentValue && currentValue !== this.d_numToleratedItems$$()) {
                this.d_numToleratedItems$$.set(currentValue);
            }
        }

        if (simpleChanges.options) {
            const { previousValue, currentValue } = simpleChanges.options;

            if (this.lazy$$() && previousValue?.loading !== currentValue?.loading && currentValue?.loading !== this.d_loading$$()) {
                this.d_loading$$.set(currentValue.loading);
                isLoadingChanged = true;
            }

            if (previousValue?.numToleratedItems !== currentValue?.numToleratedItems && currentValue?.numToleratedItems !== this.d_numToleratedItems$$()) {
                this.d_numToleratedItems$$.set(currentValue.numToleratedItems);
            }
        }

        if (this.initialized) {
            const isChanged = !isLoadingChanged && (simpleChanges.items?.previousValue?.length !== simpleChanges.items?.currentValue?.length || simpleChanges.itemSize || simpleChanges.scrollHeight || simpleChanges.scrollWidth);

            if (isChanged) {
                this.init();
                this.calculateAutoSize();
            }
        }
    }

    ngAfterContentInit() {
        this.templates$$().forEach((item) => {
            switch (item.getType()) {
                case 'content':
                    this._contentTemplate$$.set(item.template);
                    break;

                case 'item':
                    this._itemTemplate$$.set(item.template);
                    break;

                case 'loader':
                    this._loaderTemplate$$.set(item.template);
                    break;

                case 'loadericon':
                    this._loaderIconTemplate$$.set(item.template);
                    break;

                default:
                    this._itemTemplate$$.set(item.template);
                    break;
            }
        });
    }

    ngAfterViewInit() {
        super.ngAfterViewInit();
        Promise.resolve().then(() => {
            this.viewInit();
        });
    }

    ngAfterViewChecked() {
        if (!this.initialized) {
            this.viewInit();
        }
    }

    ngOnDestroy() {
        this.unbindResizeListener();

        this.contentEl$$.set(null);
        this.initialized = false;
        super.ngOnDestroy();
    }

    viewInit() {
        if (isPlatformBrowser(this.platformId) && !this.initialized) {
            if (isVisible(this.elementViewChild$$()?.nativeElement)) {
                this.setInitialState();
                this.setContentEl(this.contentEl$$());
                this.init();

                this.defaultWidth = getWidth(this.elementViewChild$$()?.nativeElement);
                this.defaultHeight = getHeight(this.elementViewChild$$()?.nativeElement);
                this.defaultContentWidth = getWidth(this.contentEl$$());
                this.defaultContentHeight = getHeight(this.contentEl$$());
                this.initialized = true;
            }
        }
    }

    init() {
        if (!this.disabled$$()) {
            this.setSize();
            this.calculateOptions();
            this.setSpacerSize();
            this.bindResizeListener();

            this.cd.detectChanges();
        }
    }

    setContentEl(el?: HTMLElement) {
        this.contentEl$$.set(el || this.contentViewChild$$()?.nativeElement || findSingle(this.elementViewChild$$()?.nativeElement, '.p-virtualscroller-content'));
    }

    setInitialState() {
        this.first$$.set(this.both$$() ? { rows: 0, cols: 0 } : 0);
        this.last$$.set(this.both$$() ? { rows: 0, cols: 0 } : 0);
        this.numItemsInViewport$$.set(this.both$$() ? { rows: 0, cols: 0 } : 0);
        this.lastScrollPos$$.set(this.both$$() ? { top: 0, left: 0 } : 0);
        this.d_loading$$.set(this.loading$$() || false);
        this.d_numToleratedItems$$.set(this.numToleratedItems$$());
    }

    getElementRef() {
        return this.elementViewChild$$();
    }

    getPageByFirst(first?: any) {
        return Math.floor(((first ?? this.first$$()) + this.d_numToleratedItems$$() * 4) / (this.step$$() || 1));
    }

    isPageChanged(first?: any) {
        return this.step$$() ? this.page$$() !== this.getPageByFirst(first ?? this.first$$()) : true;
    }

    scrollTo(options: ScrollToOptions) {
        // this.lastScrollPos$$.set(this.both ? { top: 0, left: 0 } : 0);
        this.elementViewChild$$()?.nativeElement?.scrollTo(options);
    }

    scrollToIndex(index: number | number[], behavior: ScrollBehavior = 'auto') {
        const valid = this.both$$() ? (index as number[]).every((i) => i > -1) : (index as number) > -1;

        if (valid) {
            const first = this.first$$();
            const { scrollTop = 0, scrollLeft = 0 } = this.elementViewChild$$()?.nativeElement;
            const { numToleratedItems } = this.calculateNumItems();
            const contentPos = this.getContentPosition();
            const itemSize = this.itemSize$$();
            const calculateFirst = (_index = 0, _numT) => (_index <= _numT ? 0 : _index);
            const calculateCoord = (_first, _size, _cpos) => _first * _size + _cpos;
            const scrollTo = (left = 0, top = 0) => this.scrollTo({ left, top, behavior });
            let newFirst = this.both$$() ? { rows: 0, cols: 0 } : 0;
            let isRangeChanged = false,
                isScrollChanged = false;

            if (this.both$$()) {
                newFirst = {
                    rows: calculateFirst(index[0], numToleratedItems[0]),
                    cols: calculateFirst(index[1], numToleratedItems[1])
                };
                scrollTo(calculateCoord(newFirst.cols, itemSize[1], contentPos.left), calculateCoord(newFirst.rows, itemSize[0], contentPos.top));
                isScrollChanged = this.lastScrollPos$$().top !== scrollTop || this.lastScrollPos$$().left !== scrollLeft;
                isRangeChanged = newFirst.rows !== first.rows || newFirst.cols !== first.cols;
            } else {
                newFirst = calculateFirst(index as number, numToleratedItems);
                this.horizontal$$() ? scrollTo(calculateCoord(newFirst, itemSize, contentPos.left), scrollTop) : scrollTo(scrollLeft, calculateCoord(newFirst, itemSize, contentPos.top));
                isScrollChanged = this.lastScrollPos$$() !== (this.horizontal$$() ? scrollLeft : scrollTop);
                isRangeChanged = newFirst !== first;
            }

            this.isRangeChanged$$.set(isRangeChanged);
            isScrollChanged && this.first$$.set(newFirst);
        }
    }

    scrollInView(index: number, to: ScrollerToType, behavior: ScrollBehavior = 'auto') {
        if (to) {
            const { first, viewport } = this.getRenderedRange();
            const scrollTo = (left = 0, top = 0) => this.scrollTo({ left, top, behavior });
            const isToStart = to === 'to-start';
            const isToEnd = to === 'to-end';

            if (isToStart) {
                if (this.both$$()) {
                    if (viewport.first.rows - first.rows > (<any>index)[0]) {
                        scrollTo(viewport.first.cols * (<number[]>this.itemSize$$())[1], (viewport.first.rows - 1) * (<number[]>this.itemSize$$())[0]);
                    } else if (viewport.first.cols - first.cols > (<any>index)[1]) {
                        scrollTo((viewport.first.cols - 1) * (<number[]>this.itemSize$$())[1], viewport.first.rows * (<number[]>this.itemSize$$())[0]);
                    }
                } else {
                    if (viewport.first - first > index) {
                        const pos = (viewport.first - 1) * <number>this.itemSize$$();
                        this.horizontal$$() ? scrollTo(pos, 0) : scrollTo(0, pos);
                    }
                }
            } else if (isToEnd) {
                if (this.both$$()) {
                    if (viewport.last.rows - first.rows <= (<any>index)[0] + 1) {
                        scrollTo(viewport.first.cols * (<number[]>this.itemSize$$())[1], (viewport.first.rows + 1) * (<number[]>this.itemSize$$())[0]);
                    } else if (viewport.last.cols - first.cols <= (<any>index)[1] + 1) {
                        scrollTo((viewport.first.cols + 1) * (<number[]>this.itemSize$$())[1], viewport.first.rows * (<number[]>this.itemSize$$())[0]);
                    }
                } else {
                    if (viewport.last - first <= index + 1) {
                        const pos = (viewport.first + 1) * <number>this.itemSize$$();
                        this.horizontal$$() ? scrollTo(pos, 0) : scrollTo(0, pos);
                    }
                }
            }
        } else {
            this.scrollToIndex(index, behavior);
        }
    }

    getRenderedRange() {
        const calculateFirstInViewport = (_pos: number, _size: number) => (_size || _pos ? Math.floor(_pos / (_size || _pos)) : 0);

        let firstInViewport = this.first$$();
        let lastInViewport: any = 0;

        if (this.elementViewChild$$()?.nativeElement) {
            const { scrollTop, scrollLeft } = this.elementViewChild$$().nativeElement;

            if (this.both$$()) {
                firstInViewport = {
                    rows: calculateFirstInViewport(scrollTop, (<number[]>this.itemSize$$())[0]),
                    cols: calculateFirstInViewport(scrollLeft, (<number[]>this.itemSize$$())[1])
                };
                lastInViewport = {
                    rows: firstInViewport.rows + this.numItemsInViewport$$().rows,
                    cols: firstInViewport.cols + this.numItemsInViewport$$().cols
                };
            } else {
                const scrollPos = this.horizontal$$() ? scrollLeft : scrollTop;
                firstInViewport = calculateFirstInViewport(scrollPos, <number>this.itemSize$$());
                lastInViewport = firstInViewport + this.numItemsInViewport$$();
            }
        }

        return {
            first: this.first$$(),
            last: this.last$$(),
            viewport: {
                first: firstInViewport,
                last: lastInViewport
            }
        };
    }

    calculateNumItems() {
        const contentPos = this.getContentPosition();
        const contentWidth = (this.elementViewChild$$()?.nativeElement ? this.elementViewChild$$().nativeElement.offsetWidth - contentPos.left : 0) || 0;
        const contentHeight = (this.elementViewChild$$()?.nativeElement ? this.elementViewChild$$().nativeElement.offsetHeight - contentPos.top : 0) || 0;
        const calculateNumItemsInViewport = (_contentSize: number, itemSize: number) => (itemSize || _contentSize ? Math.ceil(_contentSize / (itemSize || _contentSize)) : 0);
        const calculateNumToleratedItems = (_numItems: number) => Math.ceil(_numItems / 2);
        const numItemsInViewport: any = this.both$$()
            ? {
                  rows: calculateNumItemsInViewport(contentHeight, (<number[]>this.itemSize$$())[0]),
                  cols: calculateNumItemsInViewport(contentWidth, (<number[]>this.itemSize$$())[1])
              }
            : calculateNumItemsInViewport(this.horizontal$$() ? contentWidth : contentHeight, <number>this.itemSize$$());

        const numToleratedItems = this.d_numToleratedItems$$() || (this.both$$() ? [calculateNumToleratedItems(numItemsInViewport.rows), calculateNumToleratedItems(numItemsInViewport.cols)] : calculateNumToleratedItems(numItemsInViewport));

        return { numItemsInViewport, numToleratedItems };
    }

    calculateOptions() {
        const { numItemsInViewport, numToleratedItems } = this.calculateNumItems();
        const calculateLast = (_first: number, _num: number, _numT: number, _isCols: boolean = false) => this.getLast(_first + _num + (_first < _numT ? 2 : 3) * _numT, _isCols);
        const first = this.first$$();
        const last = this.both$$()
            ? {
                  rows: calculateLast(this.first$$().rows, numItemsInViewport.rows, numToleratedItems[0]),
                  cols: calculateLast(this.first$$().cols, numItemsInViewport.cols, numToleratedItems[1], true)
              }
            : calculateLast(this.first$$(), numItemsInViewport, numToleratedItems);

        this.last$$.set(last);
        this.numItemsInViewport$$.set(numItemsInViewport);
        this.d_numToleratedItems$$.set(numToleratedItems);

        if (this.showLoader$$()) {
            this.loaderArr$$.set(this.both$$() ? Array.from({ length: numItemsInViewport.rows }).map(() => Array.from({ length: numItemsInViewport.cols })) : Array.from({ length: numItemsInViewport }));
        }

        if (this.lazy$$()) {
            Promise.resolve().then(() => {
                const step = this.step$$();
                this.lazyLoadState$$.set({
                    first: step ? (this.both$$() ? { rows: 0, cols: first.cols } : 0) : first,
                    last: Math.min(step ? step : this.last$$(), (<any[]>this.items$$()).length)
                });

                this.handleEvents('onLazyLoad', this.lazyLoadState$$());
            });
        }
    }

    calculateAutoSize() {
        if (this.autoSize$$() && !this.d_loading$$()) {
            Promise.resolve().then(() => {
                if (this.contentEl$$()) {
                    this.contentEl$$().style.minHeight = this.contentEl$$().style.minWidth = 'auto';
                    this.contentEl$$().style.position = 'relative';
                    this.elementViewChild$$().nativeElement.style.contain = 'none';

                    const [contentWidth, contentHeight] = [getWidth(this.contentEl$$()), getHeight(this.contentEl$$())];
                    contentWidth !== this.defaultContentWidth && (this.elementViewChild$$().nativeElement.style.width = '');
                    contentHeight !== this.defaultContentHeight && (this.elementViewChild$$().nativeElement.style.height = '');

                    const [width, height] = [getWidth(this.elementViewChild$$().nativeElement), getHeight(this.elementViewChild$$().nativeElement)];
                    (this.both$$() || this.horizontal$$()) && (this.elementViewChild$$().nativeElement.style.width = width < <number>this.defaultWidth ? width + 'px' : this.scrollWidth$$() || this.defaultWidth + 'px');
                    (this.both$$() || this.vertical$$()) && (this.elementViewChild$$().nativeElement.style.height = height < <number>this.defaultHeight ? height + 'px' : this.scrollHeight$$() || this.defaultHeight + 'px');

                    this.contentEl$$().style.minHeight = this.contentEl$$().style.minWidth = '';
                    this.contentEl$$().style.position = '';
                    this.elementViewChild$$().nativeElement.style.contain = '';
                }
            });
        }
    }

    getLast(last = 0, isCols = false) {
        const items = this.items$$();
        return items ? Math.min(isCols ? (this.columns$$() || items[0]).length : items.length, last) : 0;
    }

    getContentPosition() {
        if (this.contentEl$$()) {
            const style = getComputedStyle(this.contentEl$$());
            const left = parseFloat(style.paddingLeft) + Math.max(parseFloat(style.left) || 0, 0);
            const right = parseFloat(style.paddingRight) + Math.max(parseFloat(style.right) || 0, 0);
            const top = parseFloat(style.paddingTop) + Math.max(parseFloat(style.top) || 0, 0);
            const bottom = parseFloat(style.paddingBottom) + Math.max(parseFloat(style.bottom) || 0, 0);

            return { left, right, top, bottom, x: left + right, y: top + bottom };
        }

        return { left: 0, right: 0, top: 0, bottom: 0, x: 0, y: 0 };
    }

    setSize() {
        if (this.elementViewChild$$()?.nativeElement) {
            const parentElement = this.elementViewChild$$().nativeElement.parentElement.parentElement;
            const width = this.scrollWidth$$() || `${this.elementViewChild$$().nativeElement.offsetWidth || parentElement.offsetWidth}px`;
            const height = this.scrollHeight$$() || `${this.elementViewChild$$().nativeElement.offsetHeight || parentElement.offsetHeight}px`;
            const setProp = (_name: string, _value: any) => (this.elementViewChild$$().nativeElement.style[_name] = _value);

            if (this.both$$() || this.horizontal$$()) {
                setProp('height', height);
                setProp('width', width);
            } else {
                setProp('height', height);
            }
        }
    }

    setSpacerSize() {
        const items = this.items$$();
        if (items) {
            const contentPos = this.getContentPosition();
            const setProp = (_name: string, _value: any, _size: number, _cpos: number = 0) =>
                this.spacerStyle$$.update((spacerStyle) => ({
                    ...spacerStyle,
                    ...{ [`${_name}`]: (_value || []).length * _size + _cpos + 'px' }
                }));

            if (this.both$$()) {
                setProp('height', items, (<number[]>this.itemSize$$())[0], contentPos.y);
                setProp('width', this.columns$$() || items[1], (<number[]>this.itemSize$$())[1], contentPos.x);
            } else {
                this.horizontal$$() ? setProp('width', this.columns$$() || items, <number>this.itemSize$$(), contentPos.x) : setProp('height', items, <number>this.itemSize$$(), contentPos.y);
            }
        }
    }

    setContentPosition(pos: any) {
        if (this.contentEl$$() && !this.appendOnly$$()) {
            const first = pos ? pos.first : this.first$$();
            const calculateTranslateVal = (_first: number, _size: number) => _first * _size;
            const setTransform = (_x = 0, _y = 0) => this.contentStyle$$.update((contentStyle) => ({ ...contentStyle, ...{ transform: `translate3d(${_x}px, ${_y}px, 0)` } }));

            if (this.both$$()) {
                setTransform(calculateTranslateVal(first.cols, (<number[]>this.itemSize$$())[1]), calculateTranslateVal(first.rows, (<number[]>this.itemSize$$())[0]));
            } else {
                const translateVal = calculateTranslateVal(first, <number>this.itemSize$$());
                this.horizontal$$() ? setTransform(translateVal, 0) : setTransform(0, translateVal);
            }
        }
    }

    onScrollPositionChange(event: Event) {
        const target = event.target;
        const contentPos = this.getContentPosition();
        const calculateScrollPos = (_pos: number, _cpos: number) => (_pos ? (_pos > _cpos ? _pos - _cpos : _pos) : 0);
        const calculateCurrentIndex = (_pos: number, _size: number) => (_size || _pos ? Math.floor(_pos / (_size || _pos)) : 0);
        const calculateTriggerIndex = (_currentIndex: number, _first: number, _last: number, _num: number, _numT: number, _isScrollDownOrRight: any) => {
            return _currentIndex <= _numT ? _numT : _isScrollDownOrRight ? _last - _num - _numT : _first + _numT - 1;
        };
        const calculateFirst = (_currentIndex: number, _triggerIndex: number, _first: number, _last: number, _num: number, _numT: number, _isScrollDownOrRight: any) => {
            if (_currentIndex <= _numT) return 0;
            else return Math.max(0, _isScrollDownOrRight ? (_currentIndex < _triggerIndex ? _first : _currentIndex - _numT) : _currentIndex > _triggerIndex ? _first : _currentIndex - 2 * _numT);
        };
        const calculateLast = (_currentIndex: number, _first: number, _last: number, _num: number, _numT: number, _isCols = false) => {
            let lastValue = _first + _num + 2 * _numT;

            if (_currentIndex >= _numT) {
                lastValue += _numT + 1;
            }

            return this.getLast(lastValue, _isCols);
        };

        const scrollTop = calculateScrollPos((<HTMLElement>target).scrollTop, contentPos.top);
        const scrollLeft = calculateScrollPos((<HTMLElement>target).scrollLeft, contentPos.left);

        let newFirst = this.both$$() ? { rows: 0, cols: 0 } : 0;
        let newLast = this.last$$();
        let isRangeChanged = false;
        let newScrollPos = this.lastScrollPos$$();

        if (this.both$$()) {
            const isScrollDown = this.lastScrollPos$$().top <= scrollTop;
            const isScrollRight = this.lastScrollPos$$().left <= scrollLeft;

            if (!this.appendOnly$$() || (this.appendOnly$$() && (isScrollDown || isScrollRight))) {
                const currentIndex = {
                    rows: calculateCurrentIndex(scrollTop, (<number[]>this.itemSize$$())[0]),
                    cols: calculateCurrentIndex(scrollLeft, (<number[]>this.itemSize$$())[1])
                };
                const triggerIndex = {
                    rows: calculateTriggerIndex(currentIndex.rows, this.first$$().rows, this.last$$().rows, this.numItemsInViewport$$().rows, this.d_numToleratedItems$$()[0], isScrollDown),
                    cols: calculateTriggerIndex(currentIndex.cols, this.first$$().cols, this.last$$().cols, this.numItemsInViewport$$().cols, this.d_numToleratedItems$$()[1], isScrollRight)
                };

                newFirst = {
                    rows: calculateFirst(currentIndex.rows, triggerIndex.rows, this.first$$().rows, this.last$$().rows, this.numItemsInViewport$$().rows, this.d_numToleratedItems$$()[0], isScrollDown),
                    cols: calculateFirst(currentIndex.cols, triggerIndex.cols, this.first$$().cols, this.last$$().cols, this.numItemsInViewport$$().cols, this.d_numToleratedItems$$()[1], isScrollRight)
                };
                newLast = {
                    rows: calculateLast(currentIndex.rows, newFirst.rows, this.last$$().rows, this.numItemsInViewport$$().rows, this.d_numToleratedItems$$()[0]),
                    cols: calculateLast(currentIndex.cols, newFirst.cols, this.last$$().cols, this.numItemsInViewport$$().cols, this.d_numToleratedItems$$()[1], true)
                };

                isRangeChanged = newFirst.rows !== this.first$$().rows || newLast.rows !== this.last$$().rows || newFirst.cols !== this.first$$().cols || newLast.cols !== this.last$$().cols || this.isRangeChanged$$();
                newScrollPos = { top: scrollTop, left: scrollLeft };
            }
        } else {
            const scrollPos = this.horizontal$$() ? scrollLeft : scrollTop;
            const isScrollDownOrRight = this.lastScrollPos$$() <= scrollPos;

            if (!this.appendOnly$$() || (this.appendOnly$$() && isScrollDownOrRight)) {
                const currentIndex = calculateCurrentIndex(scrollPos, <number>this.itemSize$$());
                const triggerIndex = calculateTriggerIndex(currentIndex, this.first$$(), this.last$$(), this.numItemsInViewport$$(), this.d_numToleratedItems$$(), isScrollDownOrRight);

                newFirst = calculateFirst(currentIndex, triggerIndex, this.first$$(), this.last$$(), this.numItemsInViewport$$(), this.d_numToleratedItems$$(), isScrollDownOrRight);
                newLast = calculateLast(currentIndex, newFirst, this.last$$(), this.numItemsInViewport$$(), this.d_numToleratedItems$$());
                isRangeChanged = newFirst !== this.first$$() || newLast !== this.last$$() || this.isRangeChanged$$();
                newScrollPos = scrollPos;
            }
        }

        return {
            first: newFirst,
            last: newLast,
            isRangeChanged,
            scrollPos: newScrollPos
        };
    }

    onScrollChange(event: Event) {
        const { first, last, isRangeChanged, scrollPos } = this.onScrollPositionChange(event);

        if (isRangeChanged) {
            const newState = { first, last };

            this.setContentPosition(newState);

            this.first$$.set(first);
            this.last$$.set(last);
            this.lastScrollPos$$.set(scrollPos);

            this.handleEvents('onScrollIndexChange', newState);

            if (this.lazy$$() && this.isPageChanged(first)) {
                const step = this.step$$();
                const lazyLoadState = {
                    first: step ? Math.min(this.getPageByFirst(first) * step, (<any[]>this.items$$()).length - step) : first,
                    last: Math.min(step ? (this.getPageByFirst(first) + 1) * step : last, (<any[]>this.items$$()).length)
                };
                const isLazyStateChanged = this.lazyLoadState$$().first !== lazyLoadState.first || this.lazyLoadState$$().last !== lazyLoadState.last;

                isLazyStateChanged && this.handleEvents('onLazyLoad', lazyLoadState);
                this.lazyLoadState$$.set(lazyLoadState);
            }
        }
    }

    onContainerScroll(event: Event) {
        this.handleEvents('onScroll', { originalEvent: event });

        if (this.delay$$() && this.isPageChanged()) {
            if (this.scrollTimeout) {
                clearTimeout(this.scrollTimeout);
            }

            if (!this.d_loading$$() && this.showLoader$$()) {
                const { isRangeChanged } = this.onScrollPositionChange(event);
                const changed = isRangeChanged || (this.step$$() ? this.isPageChanged() : false);

                if (changed) {
                    this.d_loading$$.set(true);

                    this.cd.detectChanges();
                }
            }

            this.scrollTimeout = setTimeout(() => {
                this.onScrollChange(event);

                if (this.d_loading$$() && this.showLoader$$() && (!this.lazy$$() || this.loading$$() === undefined)) {
                    this.d_loading$$.set(false);
                    this.page$$.set(this.getPageByFirst());
                }
                this.cd.detectChanges();
            }, this.delay$$());
        } else {
            !this.d_loading$$() && this.onScrollChange(event);
        }
    }

    bindResizeListener() {
        if (isPlatformBrowser(this.platformId)) {
            if (!this.windowResizeListener) {
                this.zone.runOutsideAngular(() => {
                    const window = this.document.defaultView as Window;
                    const event = isTouchDevice() ? 'orientationchange' : 'resize';
                    this.windowResizeListener = this.renderer.listen(window, event, this.onWindowResize.bind(this));
                });
            }
        }
    }

    unbindResizeListener() {
        if (this.windowResizeListener) {
            this.windowResizeListener();
            this.windowResizeListener = null;
        }
    }

    onWindowResize() {
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
        }

        this.resizeTimeout = setTimeout(() => {
            if (isVisible(this.elementViewChild$$()?.nativeElement)) {
                const [width, height] = [getWidth(this.elementViewChild$$()?.nativeElement), getHeight(this.elementViewChild$$()?.nativeElement)];
                const [isDiffWidth, isDiffHeight] = [width !== this.defaultWidth, height !== this.defaultHeight];
                const reinit = this.both$$() ? isDiffWidth || isDiffHeight : this.horizontal$$() ? isDiffWidth : this.vertical$$() ? isDiffHeight : false;

                reinit &&
                    this.zone.run(() => {
                        this.d_numToleratedItems$$.set(this.numToleratedItems$$());
                        this.defaultWidth = width;
                        this.defaultHeight = height;
                        this.defaultContentWidth = getWidth(this.contentEl$$());
                        this.defaultContentHeight = getHeight(this.contentEl$$());

                        this.init();
                    });
            }
        }, this.resizeDelay$$());
    }

    handleEvents(name: string, params: any) {
        //@ts-ignore
        return this.options && (<any>this.options)[name] ? (<any>this.options)[name](params) : this[name].emit(params);
    }

    contentOptions$$ = computed(() => {
        return {
            contentStyleClass: `p-virtualscroller-content ${this.d_loading$$() ? 'p-virtualscroller-loading' : ''}`,
            items: this.loadedItems$$(),
            getItemOptions: (index: number) => this.getOptions(index),
            loading: this.d_loading$$(),
            getLoaderOptions: (index: number, options?: any) => this.getLoaderOptions(index, options),
            itemSize: this.itemSize$$(),
            rows: this.loadedRows$$(),
            columns: this.loadedColumns$$(),
            spacerStyle: this.spacerStyle$$(),
            contentStyle: this.contentStyle$$(),
            vertical: this.vertical$$(),
            horizontal: this.horizontal$$(),
            both: this.both$$()
        };
    });

    getOptions(renderedIndex: number) {
        const count = (this.items$$() || []).length;
        const index = this.both$$() ? this.first$$().rows + renderedIndex : this.first$$() + renderedIndex;

        return {
            index,
            count,
            first: index === 0,
            last: index === count - 1,
            even: index % 2 === 0,
            odd: index % 2 !== 0
        };
    }

    getLoaderOptions(index: number, extOptions: any) {
        const count = this.loaderArr$$().length;

        return {
            index,
            count,
            first: index === 0,
            last: index === count - 1,
            even: index % 2 === 0,
            odd: index % 2 !== 0,
            ...extOptions
        };
    }
}

@NgModule({
    imports: [Scroller, SharedModule],
    exports: [Scroller, SharedModule]
})
export class ScrollerModule {}
