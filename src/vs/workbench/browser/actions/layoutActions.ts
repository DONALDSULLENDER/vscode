/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize } from 'vs/nls';
import Severity from 'vs/base/common/severity';
import { Registry } from 'vs/platform/registry/common/platform';
import { Action } from 'vs/base/common/actions';
import { SyncActionDescriptor, MenuId, MenuRegistry, registerAction2, Action2 } from 'vs/platform/actions/common/actions';
import { IWorkbenchActionRegistry, Extensions as WorkbenchExtensions, CATEGORIES } from 'vs/workbench/common/actions';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IWorkbenchLayoutService, Parts, Position } from 'vs/workbench/services/layout/browser/layoutService';
import { ServicesAccessor, IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { KeyMod, KeyCode, KeyChord } from 'vs/base/common/keyCodes';
import { isWindows, isLinux, isWeb } from 'vs/base/common/platform';
import { IsMacNativeContext } from 'vs/platform/contextkey/common/contextkeys';
import { KeybindingsRegistry, KeybindingWeight } from 'vs/platform/keybinding/common/keybindingsRegistry';
import { InEditorZenModeContext, IsCenteredLayoutContext, EditorAreaVisibleContext } from 'vs/workbench/common/editor';
import { ContextKeyExpr, IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { SideBarVisibleContext } from 'vs/workbench/common/viewlet';
import { IViewDescriptorService, IViewsService, FocusedViewContext, ViewContainerLocation, IViewDescriptor, ViewContainerLocationToString } from 'vs/workbench/common/views';
import { IQuickInputService, IQuickPickItem, IQuickPickSeparator } from 'vs/platform/quickinput/common/quickInput';
import { IDialogService } from 'vs/platform/dialogs/common/dialogs';
import { IActivityBarService } from 'vs/workbench/services/activityBar/browser/activityBarService';
import { IPanelService } from 'vs/workbench/services/panel/common/panelService';

const registry = Registry.as<IWorkbenchActionRegistry>(WorkbenchExtensions.WorkbenchActions);

// --- Close Side Bar

class CloseSidebarAction extends Action2 {

	constructor() {
		super({
			id: 'workbench.action.closeSidebar',
			title: { value: localize('closeSidebar', "Close Side Bar"), original: 'Close Side Bar' },
			category: CATEGORIES.View,
			f1: true
		});
	}

	run(accessor: ServicesAccessor): void {
		accessor.get(IWorkbenchLayoutService).setSideBarHidden(true);
	}
}

registerAction2(CloseSidebarAction);

// --- Toggle Activity Bar

export class ToggleActivityBarVisibilityAction extends Action2 {

	static readonly ID = 'workbench.action.toggleActivityBarVisibility';

	private static readonly activityBarVisibleKey = 'workbench.activityBar.visible';

	constructor() {
		super({
			id: ToggleActivityBarVisibilityAction.ID,
			title: {
				value: localize('toggleActivityBar', "Toggle Activity Bar Visibility"),
				mnemonicTitle: localize({ key: 'miShowActivityBar', comment: ['&& denotes a mnemonic'] }, "Show &&Activity Bar"),
				original: 'Toggle Activity Bar Visibility'
			},
			category: CATEGORIES.View,
			f1: true,
			toggled: ContextKeyExpr.equals('config.workbench.activityBar.visible', true),
			menu: {
				id: MenuId.MenubarAppearanceMenu,
				group: '2_workbench_layout',
				order: 4
			}
		});
	}

	run(accessor: ServicesAccessor): void {
		const layoutService = accessor.get(IWorkbenchLayoutService);
		const configurationService = accessor.get(IConfigurationService);

		const visibility = layoutService.isVisible(Parts.ACTIVITYBAR_PART);
		const newVisibilityValue = !visibility;

		configurationService.updateValue(ToggleActivityBarVisibilityAction.activityBarVisibleKey, newVisibilityValue);
	}
}

registerAction2(ToggleActivityBarVisibilityAction);

// --- Toggle Centered Layout

class ToggleCenteredLayout extends Action2 {

	constructor() {
		super({
			id: 'workbench.action.toggleCenteredLayout',
			title: {
				value: localize('toggleCenteredLayout', "Toggle Centered Layout"),
				mnemonicTitle: localize({ key: 'miToggleCenteredLayout', comment: ['&& denotes a mnemonic'] }, "&&Centered Layout"),
				original: 'Toggle Centered Layout'
			},
			category: CATEGORIES.View,
			f1: true,
			toggled: IsCenteredLayoutContext,
			menu: {
				id: MenuId.MenubarAppearanceMenu,
				group: '1_toggle_view',
				order: 3
			}
		});
	}

	run(accessor: ServicesAccessor): void {
		const layoutService = accessor.get(IWorkbenchLayoutService);

		layoutService.centerEditorLayout(!layoutService.isEditorLayoutCentered());
	}
}

registerAction2(ToggleCenteredLayout);

// --- Toggle Sidebar Position

export class ToggleSidebarPositionAction extends Action {

	static readonly ID = 'workbench.action.toggleSidebarPosition';
	static readonly LABEL = localize('toggleSidebarPosition', "Toggle Side Bar Position");

	private static readonly sidebarPositionConfigurationKey = 'workbench.sideBar.location';

	constructor(
		id: string,
		label: string,
		@IWorkbenchLayoutService private readonly layoutService: IWorkbenchLayoutService,
		@IConfigurationService private readonly configurationService: IConfigurationService
	) {
		super(id, label);
	}

	override run(): Promise<void> {
		const position = this.layoutService.getSideBarPosition();
		const newPositionValue = (position === Position.LEFT) ? 'right' : 'left';

		return this.configurationService.updateValue(ToggleSidebarPositionAction.sidebarPositionConfigurationKey, newPositionValue);
	}

	static getLabel(layoutService: IWorkbenchLayoutService): string {
		return layoutService.getSideBarPosition() === Position.LEFT ? localize('moveSidebarRight', "Move Side Bar Right") : localize('moveSidebarLeft', "Move Side Bar Left");
	}
}

registerAction2(class extends Action2 {
	constructor() {
		super({
			id: ToggleSidebarPositionAction.ID,
			title: { value: localize('toggleSidebarPosition', "Toggle Side Bar Position"), original: 'Toggle Side Bar Position' },
			category: CATEGORIES.View,
			f1: true
		});
	}
	run(accessor: ServicesAccessor) {
		accessor.get(IInstantiationService).createInstance(ToggleSidebarPositionAction, ToggleSidebarPositionAction.ID, ToggleSidebarPositionAction.LABEL).run();
	}
});
MenuRegistry.appendMenuItems([{
	id: MenuId.ViewContainerTitleContext,
	item: {
		group: '3_workbench_layout_move',
		command: {
			id: ToggleSidebarPositionAction.ID,
			title: localize('move sidebar right', "Move Side Bar Right")
		},
		when: ContextKeyExpr.and(ContextKeyExpr.notEquals('config.workbench.sideBar.location', 'right'), ContextKeyExpr.equals('viewContainerLocation', ViewContainerLocationToString(ViewContainerLocation.Sidebar))),
		order: 1
	}
}, {
	id: MenuId.ViewTitleContext,
	item: {
		group: '3_workbench_layout_move',
		command: {
			id: ToggleSidebarPositionAction.ID,
			title: localize('move sidebar right', "Move Side Bar Right")
		},
		when: ContextKeyExpr.and(ContextKeyExpr.notEquals('config.workbench.sideBar.location', 'right'), ContextKeyExpr.equals('viewLocation', ViewContainerLocationToString(ViewContainerLocation.Sidebar))),
		order: 1
	}
}, {
	id: MenuId.ViewContainerTitleContext,
	item: {
		group: '3_workbench_layout_move',
		command: {
			id: ToggleSidebarPositionAction.ID,
			title: localize('move sidebar left', "Move Side Bar Left")
		},
		when: ContextKeyExpr.and(ContextKeyExpr.equals('config.workbench.sideBar.location', 'right'), ContextKeyExpr.equals('viewContainerLocation', ViewContainerLocationToString(ViewContainerLocation.Sidebar))),
		order: 1
	}
}, {
	id: MenuId.ViewTitleContext,
	item: {
		group: '3_workbench_layout_move',
		command: {
			id: ToggleSidebarPositionAction.ID,
			title: localize('move sidebar left', "Move Side Bar Left")
		},
		when: ContextKeyExpr.and(ContextKeyExpr.equals('config.workbench.sideBar.location', 'right'), ContextKeyExpr.equals('viewLocation', ViewContainerLocationToString(ViewContainerLocation.Sidebar))),
		order: 1
	}
}]);

MenuRegistry.appendMenuItem(MenuId.MenubarAppearanceMenu, {
	group: '3_workbench_layout_move',
	command: {
		id: ToggleSidebarPositionAction.ID,
		title: localize({ key: 'miMoveSidebarRight', comment: ['&& denotes a mnemonic'] }, "&&Move Side Bar Right")
	},
	when: ContextKeyExpr.notEquals('config.workbench.sideBar.location', 'right'),
	order: 2
});

MenuRegistry.appendMenuItem(MenuId.MenubarAppearanceMenu, {
	group: '3_workbench_layout_move',
	command: {
		id: ToggleSidebarPositionAction.ID,
		title: localize({ key: 'miMoveSidebarLeft', comment: ['&& denotes a mnemonic'] }, "&&Move Side Bar Left")
	},
	when: ContextKeyExpr.equals('config.workbench.sideBar.location', 'right'),
	order: 2
});

// --- Toggle Sidebar Visibility

export class ToggleEditorVisibilityAction extends Action {
	static readonly ID = 'workbench.action.toggleEditorVisibility';
	static readonly LABEL = localize('toggleEditor', "Toggle Editor Area Visibility");

	constructor(
		id: string,
		label: string,
		@IWorkbenchLayoutService private readonly layoutService: IWorkbenchLayoutService
	) {
		super(id, label);
	}

	override async run(): Promise<void> {
		this.layoutService.toggleMaximizedPanel();
	}
}

registry.registerWorkbenchAction(SyncActionDescriptor.from(ToggleEditorVisibilityAction), 'View: Toggle Editor Area Visibility', CATEGORIES.View.value);

MenuRegistry.appendMenuItem(MenuId.MenubarAppearanceMenu, {
	group: '2_workbench_layout',
	command: {
		id: ToggleEditorVisibilityAction.ID,
		title: localize({ key: 'miShowEditorArea', comment: ['&& denotes a mnemonic'] }, "Show &&Editor Area"),
		toggled: EditorAreaVisibleContext
	},
	order: 5
});

MenuRegistry.appendMenuItem(MenuId.MenubarViewMenu, {
	group: '2_appearance',
	title: localize({ key: 'miAppearance', comment: ['&& denotes a mnemonic'] }, "&&Appearance"),
	submenu: MenuId.MenubarAppearanceMenu,
	order: 1
});

export const TOGGLE_SIDEBAR_VISIBILITY_ACTION_ID = 'workbench.action.toggleSidebarVisibility';
registerAction2(class extends Action2 {
	constructor() {
		super({
			id: TOGGLE_SIDEBAR_VISIBILITY_ACTION_ID,
			title: { value: localize('toggleSidebar', "Toggle Side Bar Visibility"), original: 'Toggle Side Bar Visibility' },
			category: CATEGORIES.View,
			f1: true,
			keybinding: {
				weight: KeybindingWeight.WorkbenchContrib,
				primary: KeyMod.CtrlCmd | KeyCode.KEY_B
			}
		});
	}
	run(accessor: ServicesAccessor) {
		const layoutService = accessor.get(IWorkbenchLayoutService);
		layoutService.setSideBarHidden(layoutService.isVisible(Parts.SIDEBAR_PART));
	}
});
MenuRegistry.appendMenuItems([{
	id: MenuId.ViewContainerTitleContext,
	item: {
		group: '3_workbench_layout_move',
		command: {
			id: TOGGLE_SIDEBAR_VISIBILITY_ACTION_ID,
			title: localize('compositePart.hideSideBarLabel', "Hide Side Bar"),
		},
		when: ContextKeyExpr.and(SideBarVisibleContext, ContextKeyExpr.equals('viewContainerLocation', ViewContainerLocationToString(ViewContainerLocation.Sidebar))),
		order: 2
	}
}, {
	id: MenuId.ViewTitleContext,
	item: {
		group: '3_workbench_layout_move',
		command: {
			id: TOGGLE_SIDEBAR_VISIBILITY_ACTION_ID,
			title: localize('compositePart.hideSideBarLabel', "Hide Side Bar"),
		},
		when: ContextKeyExpr.and(SideBarVisibleContext, ContextKeyExpr.equals('viewLocation', ViewContainerLocationToString(ViewContainerLocation.Sidebar))),
		order: 2
	}
}]);

MenuRegistry.appendMenuItem(MenuId.MenubarAppearanceMenu, {
	group: '2_workbench_layout',
	command: {
		id: TOGGLE_SIDEBAR_VISIBILITY_ACTION_ID,
		title: localize({ key: 'miShowSidebar', comment: ['&& denotes a mnemonic'] }, "Show &&Side Bar"),
		toggled: SideBarVisibleContext
	},
	order: 1
});

// --- Toggle Statusbar Visibility

export class ToggleStatusbarVisibilityAction extends Action {

	static readonly ID = 'workbench.action.toggleStatusbarVisibility';
	static readonly LABEL = localize('toggleStatusbar', "Toggle Status Bar Visibility");

	private static readonly statusbarVisibleKey = 'workbench.statusBar.visible';

	constructor(
		id: string,
		label: string,
		@IWorkbenchLayoutService private readonly layoutService: IWorkbenchLayoutService,
		@IConfigurationService private readonly configurationService: IConfigurationService
	) {
		super(id, label);
	}

	override run(): Promise<void> {
		const visibility = this.layoutService.isVisible(Parts.STATUSBAR_PART);
		const newVisibilityValue = !visibility;

		return this.configurationService.updateValue(ToggleStatusbarVisibilityAction.statusbarVisibleKey, newVisibilityValue);
	}
}

registry.registerWorkbenchAction(SyncActionDescriptor.from(ToggleStatusbarVisibilityAction), 'View: Toggle Status Bar Visibility', CATEGORIES.View.value);

MenuRegistry.appendMenuItem(MenuId.MenubarAppearanceMenu, {
	group: '2_workbench_layout',
	command: {
		id: ToggleStatusbarVisibilityAction.ID,
		title: localize({ key: 'miShowStatusbar', comment: ['&& denotes a mnemonic'] }, "Show S&&tatus Bar"),
		toggled: ContextKeyExpr.equals('config.workbench.statusBar.visible', true)
	},
	order: 3
});

// --- Toggle Tabs Visibility

class ToggleTabsVisibilityAction extends Action {

	static readonly ID = 'workbench.action.toggleTabsVisibility';
	static readonly LABEL = localize('toggleTabs', "Toggle Tab Visibility");

	private static readonly tabsVisibleKey = 'workbench.editor.showTabs';

	constructor(
		id: string,
		label: string,
		@IConfigurationService private readonly configurationService: IConfigurationService
	) {
		super(id, label);
	}

	override run(): Promise<void> {
		const visibility = this.configurationService.getValue<string>(ToggleTabsVisibilityAction.tabsVisibleKey);
		const newVisibilityValue = !visibility;

		return this.configurationService.updateValue(ToggleTabsVisibilityAction.tabsVisibleKey, newVisibilityValue);
	}
}

registry.registerWorkbenchAction(SyncActionDescriptor.from(ToggleTabsVisibilityAction, {
	primary: undefined,
	mac: { primary: KeyMod.CtrlCmd | KeyMod.WinCtrl | KeyCode.KEY_W, },
	linux: { primary: KeyMod.CtrlCmd | KeyMod.WinCtrl | KeyCode.KEY_W, }
}), 'View: Toggle Tab Visibility', CATEGORIES.View.value);

// --- Toggle Zen Mode

class ToggleZenMode extends Action {

	static readonly ID = 'workbench.action.toggleZenMode';
	static readonly LABEL = localize('toggleZenMode', "Toggle Zen Mode");

	constructor(
		id: string,
		label: string,
		@IWorkbenchLayoutService private readonly layoutService: IWorkbenchLayoutService
	) {
		super(id, label);
	}

	override async run(): Promise<void> {
		this.layoutService.toggleZenMode();
	}
}

registry.registerWorkbenchAction(SyncActionDescriptor.from(ToggleZenMode, { primary: KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyCode.KEY_Z) }), 'View: Toggle Zen Mode', CATEGORIES.View.value);

MenuRegistry.appendMenuItem(MenuId.MenubarAppearanceMenu, {
	group: '1_toggle_view',
	command: {
		id: ToggleZenMode.ID,
		title: localize('miToggleZenMode', "Zen Mode"),
		toggled: InEditorZenModeContext
	},
	order: 2
});

KeybindingsRegistry.registerCommandAndKeybindingRule({
	id: 'workbench.action.exitZenMode',
	weight: KeybindingWeight.EditorContrib - 1000,
	handler(accessor: ServicesAccessor) {
		const layoutService = accessor.get(IWorkbenchLayoutService);
		layoutService.toggleZenMode();
	},
	when: InEditorZenModeContext,
	primary: KeyChord(KeyCode.Escape, KeyCode.Escape)
});

// --- Toggle Menu Bar

export class ToggleMenuBarAction extends Action {

	static readonly ID = 'workbench.action.toggleMenuBar';
	static readonly LABEL = localize('toggleMenuBar', "Toggle Menu Bar");

	constructor(
		id: string,
		label: string,
		@IWorkbenchLayoutService private readonly layoutService: IWorkbenchLayoutService
	) {
		super(id, label);
	}

	override async run(): Promise<void> {
		this.layoutService.toggleMenuBar();
	}
}

if (isWindows || isLinux || isWeb) {
	registry.registerWorkbenchAction(SyncActionDescriptor.from(ToggleMenuBarAction), 'View: Toggle Menu Bar', CATEGORIES.View.value);
}

MenuRegistry.appendMenuItem(MenuId.MenubarAppearanceMenu, {
	group: '2_workbench_layout',
	command: {
		id: ToggleMenuBarAction.ID,
		title: localize({ key: 'miShowMenuBar', comment: ['&& denotes a mnemonic'] }, "Show Menu &&Bar"),
		toggled: ContextKeyExpr.and(IsMacNativeContext.toNegated(), ContextKeyExpr.notEquals('config.window.menuBarVisibility', 'hidden'), ContextKeyExpr.notEquals('config.window.menuBarVisibility', 'toggle'), ContextKeyExpr.notEquals('config.window.menuBarVisibility', 'compact'))
	},
	when: IsMacNativeContext.toNegated(),
	order: 0
});

// --- Reset View Positions

export class ResetViewLocationsAction extends Action {
	static readonly ID = 'workbench.action.resetViewLocations';
	static readonly LABEL = localize('resetViewLocations', "Reset View Locations");

	constructor(
		id: string,
		label: string,
		@IViewDescriptorService private viewDescriptorService: IViewDescriptorService
	) {
		super(id, label);
	}

	override async run(): Promise<void> {
		this.viewDescriptorService.reset();
	}
}

registry.registerWorkbenchAction(SyncActionDescriptor.from(ResetViewLocationsAction), 'View: Reset View Locations', CATEGORIES.View.value);

// --- Move View with Command
export class MoveViewAction extends Action {
	static readonly ID = 'workbench.action.moveView';
	static readonly LABEL = localize('moveView', "Move View");

	constructor(
		id: string,
		label: string,
		@IViewDescriptorService private viewDescriptorService: IViewDescriptorService,
		@IInstantiationService private instantiationService: IInstantiationService,
		@IQuickInputService private quickInputService: IQuickInputService,
		@IContextKeyService private contextKeyService: IContextKeyService,
		@IActivityBarService private activityBarService: IActivityBarService,
		@IPanelService private panelService: IPanelService
	) {
		super(id, label);
	}

	private getViewItems(): Array<IQuickPickItem | IQuickPickSeparator> {
		const results: Array<IQuickPickItem | IQuickPickSeparator> = [];

		const viewlets = this.activityBarService.getVisibleViewContainerIds();
		viewlets.forEach(viewletId => {
			const container = this.viewDescriptorService.getViewContainerById(viewletId)!;
			const containerModel = this.viewDescriptorService.getViewContainerModel(container);

			let hasAddedView = false;
			containerModel.visibleViewDescriptors.forEach(viewDescriptor => {
				if (viewDescriptor.canMoveView) {
					if (!hasAddedView) {
						results.push({
							type: 'separator',
							label: localize('sidebarContainer', "Side Bar / {0}", containerModel.title)
						});
						hasAddedView = true;
					}

					results.push({
						id: viewDescriptor.id,
						label: viewDescriptor.name
					});
				}
			});
		});

		const panels = this.panelService.getPinnedPanels();
		panels.forEach(panel => {
			const container = this.viewDescriptorService.getViewContainerById(panel.id)!;
			const containerModel = this.viewDescriptorService.getViewContainerModel(container);

			let hasAddedView = false;
			containerModel.visibleViewDescriptors.forEach(viewDescriptor => {
				if (viewDescriptor.canMoveView) {
					if (!hasAddedView) {
						results.push({
							type: 'separator',
							label: localize('panelContainer', "Panel / {0}", containerModel.title)
						});
						hasAddedView = true;
					}

					results.push({
						id: viewDescriptor.id,
						label: viewDescriptor.name
					});
				}
			});
		});

		return results;
	}

	private async getView(viewId?: string): Promise<string> {
		const quickPick = this.quickInputService.createQuickPick();
		quickPick.placeholder = localize('moveFocusedView.selectView', "Select a View to Move");
		quickPick.items = this.getViewItems();
		quickPick.selectedItems = quickPick.items.filter(item => (item as IQuickPickItem).id === viewId) as IQuickPickItem[];

		return new Promise((resolve, reject) => {
			quickPick.onDidAccept(() => {
				const viewId = quickPick.selectedItems[0];
				if (viewId.id) {
					resolve(viewId.id);
				} else {
					reject();
				}

				quickPick.hide();
			});

			quickPick.onDidHide(() => reject());

			quickPick.show();
		});
	}

	override async run(): Promise<void> {
		const focusedViewId = FocusedViewContext.getValue(this.contextKeyService);
		let viewId: string;

		if (focusedViewId && this.viewDescriptorService.getViewDescriptorById(focusedViewId)?.canMoveView) {
			viewId = focusedViewId;
		}

		viewId = await this.getView(viewId!);

		if (!viewId) {
			return;
		}

		this.instantiationService.createInstance(MoveFocusedViewAction, MoveFocusedViewAction.ID, MoveFocusedViewAction.LABEL).run(viewId);
	}
}

registry.registerWorkbenchAction(SyncActionDescriptor.from(MoveViewAction), 'View: Move View', CATEGORIES.View.value);

// --- Move Focused View with Command
export class MoveFocusedViewAction extends Action {
	static readonly ID = 'workbench.action.moveFocusedView';
	static readonly LABEL = localize('moveFocusedView', "Move Focused View");

	constructor(
		id: string,
		label: string,
		@IViewDescriptorService private viewDescriptorService: IViewDescriptorService,
		@IViewsService private viewsService: IViewsService,
		@IQuickInputService private quickInputService: IQuickInputService,
		@IContextKeyService private contextKeyService: IContextKeyService,
		@IDialogService private dialogService: IDialogService,
		@IActivityBarService private activityBarService: IActivityBarService,
		@IPanelService private panelService: IPanelService
	) {
		super(id, label);
	}

	override async run(viewId: string): Promise<void> {
		const focusedViewId = viewId || FocusedViewContext.getValue(this.contextKeyService);

		if (focusedViewId === undefined || focusedViewId.trim() === '') {
			this.dialogService.show(Severity.Error, localize('moveFocusedView.error.noFocusedView', "There is no view currently focused."), [localize('ok', 'OK')]);
			return;
		}

		const viewDescriptor = this.viewDescriptorService.getViewDescriptorById(focusedViewId);
		if (!viewDescriptor || !viewDescriptor.canMoveView) {
			this.dialogService.show(Severity.Error, localize('moveFocusedView.error.nonMovableView', "The currently focused view is not movable."), [localize('ok', 'OK')]);
			return;
		}

		const quickPick = this.quickInputService.createQuickPick();
		quickPick.placeholder = localize('moveFocusedView.selectDestination', "Select a Destination for the View");
		quickPick.title = localize({ key: 'moveFocusedView.title', comment: ['{0} indicates the title of the view the user has selected to move.'] }, "View: Move {0}", viewDescriptor.name);

		const items: Array<IQuickPickItem | IQuickPickSeparator> = [];
		const currentContainer = this.viewDescriptorService.getViewContainerByViewId(focusedViewId)!;
		const currentLocation = this.viewDescriptorService.getViewLocationById(focusedViewId)!;
		const isViewSolo = this.viewDescriptorService.getViewContainerModel(currentContainer).allViewDescriptors.length === 1;

		if (!(isViewSolo && currentLocation === ViewContainerLocation.Panel)) {
			items.push({
				id: '_.panel.newcontainer',
				label: localize({ key: 'moveFocusedView.newContainerInPanel', comment: ['Creates a new top-level tab in the panel.'] }, "New Panel Entry"),
			});
		}

		if (!(isViewSolo && currentLocation === ViewContainerLocation.Sidebar)) {
			items.push({
				id: '_.sidebar.newcontainer',
				label: localize('moveFocusedView.newContainerInSidebar', "New Side Bar Entry")
			});
		}

		items.push({
			type: 'separator',
			label: localize('sidebar', "Side Bar")
		});

		const pinnedViewlets = this.activityBarService.getVisibleViewContainerIds();
		items.push(...pinnedViewlets
			.filter(viewletId => {
				if (viewletId === this.viewDescriptorService.getViewContainerByViewId(focusedViewId)!.id) {
					return false;
				}

				return !this.viewDescriptorService.getViewContainerById(viewletId)!.rejectAddedViews;
			})
			.map(viewletId => {
				return {
					id: viewletId,
					label: this.viewDescriptorService.getViewContainerModel(this.viewDescriptorService.getViewContainerById(viewletId)!)!.title
				};
			}));

		items.push({
			type: 'separator',
			label: localize('panel', "Panel")
		});

		const pinnedPanels = this.panelService.getPinnedPanels();
		items.push(...pinnedPanels
			.filter(panel => {
				if (panel.id === this.viewDescriptorService.getViewContainerByViewId(focusedViewId)!.id) {
					return false;
				}

				return !this.viewDescriptorService.getViewContainerById(panel.id)!.rejectAddedViews;
			})
			.map(panel => {
				return {
					id: panel.id,
					label: this.viewDescriptorService.getViewContainerModel(this.viewDescriptorService.getViewContainerById(panel.id)!)!.title
				};
			}));

		quickPick.items = items;

		quickPick.onDidAccept(() => {
			const destination = quickPick.selectedItems[0];

			if (destination.id === '_.panel.newcontainer') {
				this.viewDescriptorService.moveViewToLocation(viewDescriptor!, ViewContainerLocation.Panel);
				this.viewsService.openView(focusedViewId, true);
			} else if (destination.id === '_.sidebar.newcontainer') {
				this.viewDescriptorService.moveViewToLocation(viewDescriptor!, ViewContainerLocation.Sidebar);
				this.viewsService.openView(focusedViewId, true);
			} else if (destination.id) {
				this.viewDescriptorService.moveViewsToContainer([viewDescriptor], this.viewDescriptorService.getViewContainerById(destination.id)!);
				this.viewsService.openView(focusedViewId, true);
			}

			quickPick.hide();
		});

		quickPick.show();
	}
}

registry.registerWorkbenchAction(SyncActionDescriptor.from(MoveFocusedViewAction), 'View: Move Focused View', CATEGORIES.View.value, FocusedViewContext.notEqualsTo(''));

// --- Reset View Location with Command
export class ResetFocusedViewLocationAction extends Action {
	static readonly ID = 'workbench.action.resetFocusedViewLocation';
	static readonly LABEL = localize('resetFocusedViewLocation', "Reset Focused View Location");

	constructor(
		id: string,
		label: string,
		@IViewDescriptorService private viewDescriptorService: IViewDescriptorService,
		@IContextKeyService private contextKeyService: IContextKeyService,
		@IDialogService private dialogService: IDialogService,
		@IViewsService private viewsService: IViewsService
	) {
		super(id, label);
	}

	override async run(): Promise<void> {
		const focusedViewId = FocusedViewContext.getValue(this.contextKeyService);

		let viewDescriptor: IViewDescriptor | null = null;
		if (focusedViewId !== undefined && focusedViewId.trim() !== '') {
			viewDescriptor = this.viewDescriptorService.getViewDescriptorById(focusedViewId);
		}

		if (!viewDescriptor) {
			this.dialogService.show(Severity.Error, localize('resetFocusedView.error.noFocusedView', "There is no view currently focused."), [localize('ok', 'OK')]);
			return;
		}

		const defaultContainer = this.viewDescriptorService.getDefaultContainerById(viewDescriptor.id);
		if (!defaultContainer || defaultContainer === this.viewDescriptorService.getViewContainerByViewId(viewDescriptor.id)) {
			return;
		}

		this.viewDescriptorService.moveViewsToContainer([viewDescriptor], defaultContainer);
		this.viewsService.openView(viewDescriptor.id, true);

	}
}

registry.registerWorkbenchAction(SyncActionDescriptor.from(ResetFocusedViewLocationAction), 'View: Reset Focused View Location', CATEGORIES.View.value, FocusedViewContext.notEqualsTo(''));


// --- Resize View

export abstract class BaseResizeViewAction extends Action2 {

	protected static readonly RESIZE_INCREMENT = 6.5; // This is a media-size percentage

	protected resizePart(widthChange: number, heightChange: number, layoutService: IWorkbenchLayoutService, partToResize?: Parts): void {

		let part: Parts | undefined;
		if (partToResize === undefined) {
			const isEditorFocus = layoutService.hasFocus(Parts.EDITOR_PART);
			const isSidebarFocus = layoutService.hasFocus(Parts.SIDEBAR_PART);
			const isPanelFocus = layoutService.hasFocus(Parts.PANEL_PART);

			if (isSidebarFocus) {
				part = Parts.SIDEBAR_PART;
			} else if (isPanelFocus) {
				part = Parts.PANEL_PART;
			} else if (isEditorFocus) {
				part = Parts.EDITOR_PART;
			}
		} else {
			part = partToResize;
		}

		if (part) {
			layoutService.resizePart(part, widthChange, heightChange);
		}
	}
}

export class IncreaseViewSizeAction extends BaseResizeViewAction {

	constructor() {
		super({
			id: 'workbench.action.increaseViewSize',
			title: { value: localize('increaseViewSize', "Increase Current View Size"), original: 'Increase Current View Size' },
			f1: true
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		this.resizePart(BaseResizeViewAction.RESIZE_INCREMENT, BaseResizeViewAction.RESIZE_INCREMENT, accessor.get(IWorkbenchLayoutService));
	}
}

export class IncreaseViewWidthAction extends BaseResizeViewAction {

	constructor() {
		super({
			id: 'workbench.action.increaseViewWidth',
			title: { value: localize('increaseEditorWidth', "Increase Editor Width"), original: 'Increase Editor Width' },
			f1: true
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		this.resizePart(BaseResizeViewAction.RESIZE_INCREMENT, 0, accessor.get(IWorkbenchLayoutService), Parts.EDITOR_PART);
	}
}

export class IncreaseViewHeightAction extends BaseResizeViewAction {

	constructor() {
		super({
			id: 'workbench.action.increaseViewHeight',
			title: { value: localize('increaseEditorHeight', "Increase Editor Height"), original: 'Increase Editor Height' },
			f1: true
		});
	}
	async run(accessor: ServicesAccessor): Promise<void> {
		this.resizePart(0, BaseResizeViewAction.RESIZE_INCREMENT, accessor.get(IWorkbenchLayoutService), Parts.EDITOR_PART);
	}
}

export class DecreaseViewSizeAction extends BaseResizeViewAction {

	constructor() {
		super({
			id: 'workbench.action.decreaseViewSize',
			title: { value: localize('decreaseViewSize', "Decrease Current View Size"), original: 'Decrease Current View Size' },
			f1: true
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		this.resizePart(-BaseResizeViewAction.RESIZE_INCREMENT, -BaseResizeViewAction.RESIZE_INCREMENT, accessor.get(IWorkbenchLayoutService));
	}
}

export class DecreaseViewWidthAction extends BaseResizeViewAction {
	constructor() {
		super({
			id: 'workbench.action.decreaseViewWidth',
			title: { value: localize('decreaseEditorWidth', "Decrease Editor Width"), original: 'Decrease Editor Width' },
			f1: true
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		this.resizePart(-BaseResizeViewAction.RESIZE_INCREMENT, 0, accessor.get(IWorkbenchLayoutService), Parts.EDITOR_PART);
	}
}


export class DecreaseViewHeightAction extends BaseResizeViewAction {

	constructor() {
		super({
			id: 'workbench.action.decreaseViewHeight',
			title: { value: localize('decreaseEditorHeight', "Decrease Editor Height"), original: 'Decrease Editor Height' },
			f1: true
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		this.resizePart(0, -BaseResizeViewAction.RESIZE_INCREMENT, accessor.get(IWorkbenchLayoutService), Parts.EDITOR_PART);
	}
}

registerAction2(IncreaseViewSizeAction);
registerAction2(IncreaseViewWidthAction);
registerAction2(IncreaseViewHeightAction);

registerAction2(DecreaseViewSizeAction);
registerAction2(DecreaseViewWidthAction);
registerAction2(DecreaseViewHeightAction);
