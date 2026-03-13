
import React, { useState } from 'react';
import { ChipsButton } from '@chips/component-library';
import { useTranslation } from '../../hooks/useTranslation';
import { PluginHost } from './PluginHost';
import './EditPanel.css';

interface EditPanelProps {
  position?: 'right' | 'left';
  width?: number;
  defaultExpanded?: boolean;
}

export default function EditPanel({
  position = 'right',
  width = 320,
  defaultExpanded = true,
}: EditPanelProps) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  
  // To be replaced with actual active card and selected base card from context
  const selectedBaseCardId = null; // e.g. from useCardStore()
  const selectedBaseCard = null; // e.g. from useCardStore()

  const toggleExpand = () => setIsExpanded(!isExpanded);

  const panelStyle = {
    '--panel-width': `${isExpanded ? width : 0}px`,
    width: `${isExpanded ? width : 0}px`,
  } as React.CSSProperties;

  const panelClass = [
    'edit-panel',
    isExpanded ? 'edit-panel--expanded' : 'edit-panel--collapsed',
    `edit-panel--${position}`,
  ].join(' ');

  // New state for the updated header and body
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState(t('edit_panel.title') || '属性编辑');
  const [subtitle, setSubtitle] = useState(selectedBaseCardId || t('edit_panel.no_selection') || '未选择卡片');
  const [isCollapsed, setIsCollapsed] = useState(!isExpanded); // Use !isExpanded to match initial state
  
  // Mock actions for the header
  const actions = [
    { icon: '⚙️', tooltip: t('common.settings') || '设置', onClick: () => console.log('Settings clicked') },
    { icon: '🗑️', tooltip: t('common.delete') || '删除', onClick: () => console.log('Delete clicked'), disabled: false },
  ];

  // Update subtitle when selectedBaseCardId changes
  React.useEffect(() => {
    setSubtitle(selectedBaseCardId || t('edit_panel.no_selection') || '未选择卡片');
  }, [selectedBaseCardId, t]);

  // Update isCollapsed when isExpanded changes
  React.useEffect(() => {
    setIsCollapsed(!isExpanded);
  }, [isExpanded]);


  return (
    <div className={panelClass} style={panelStyle} role="complementary" aria-label={t('edit_panel.title') || '编辑面板'}>
      <div className="edit-panel__header">
        <div className="edit-panel__header-heading">
          {isEditingTitle ? (
            <input
              type="text"
              className="edit-panel__header-title-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => setIsEditingTitle(false)}
              onKeyDown={(e) => e.key === 'Enter' && setIsEditingTitle(false)}
              autoFocus
            />
          ) : (
            <h2 
              className="edit-panel__header-title"
              onDoubleClick={() => setIsEditingTitle(true)}
            >
              {title}
            </h2>
          )}
          {subtitle && <span className="edit-panel__header-subtitle">{subtitle}</span>}
        </div>
        
        <div className="edit-panel__header-actions">
          {actions.map((action, index) => (
            <ChipsButton
              key={index}
              variant="ghost"
              className="edit-panel__header-btn"
              onPress={action.onClick}
              title={action.tooltip}
              isDisabled={action.disabled}
            >
              <span className="edit-panel__header-btn-icon">{action.icon}</span>
            </ChipsButton>
          ))}
          <ChipsButton
            variant="ghost"
            className="edit-panel__header-btn edit-panel__header-btn--collapse"
            onPress={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? (t('common.expand') || '展开') : (t('common.collapse') || '折叠')}
          >
            <span className={`edit-panel__header-btn-icon ${isCollapsed ? 'collapsed' : ''}`}>▼</span>
          </ChipsButton>
        </div>
      </div>
      
      <div className={`edit-panel__body ${isCollapsed ? 'edit-panel__body--hidden' : ''}`}>
        {selectedBaseCard ? ( // Conditional rendering based on active card type
          <PluginHost 
            cardType="RichTextCard" // This should be dynamic based on selectedBaseCard.type
            baseCardId="mock-card-id" // This should be dynamic based on selectedBaseCard.id
            config={{}} // This should be dynamic based on selectedBaseCard.config
          />
        ) : (
          <div className="edit-panel__empty">
            <div className="edit-panel__empty-icon">📝</div>
            <p className="edit-panel__empty-text">{t('edit_panel.empty_hint') || '请在左侧选择要编辑的内容'}</p>
          </div>
        )}
      </div>
    </div>
  );
}
