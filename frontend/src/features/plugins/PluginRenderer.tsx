import React, { useEffect, useState } from 'react';
import { UIElement } from './types';

interface PluginRendererProps {
  pluginId: string;
}

export const PluginRenderer: React.FC<PluginRendererProps> = ({ pluginId }) => {
  const [uiSchema, setUiSchema] = useState<UIElement | null>(null);

  useEffect(() => {
    // Listen for UI_UPDATE events dispatched by the PluginHost for this specific plugin
    const handleUIUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<UIElement>;
      setUiSchema(customEvent.detail);
    };

    window.addEventListener(`plugin:ui:${pluginId}`, handleUIUpdate);
    return () => window.removeEventListener(`plugin:ui:${pluginId}`, handleUIUpdate);
  }, [pluginId]);

  const renderElement = (el: UIElement): React.ReactNode => {
    switch (el.type) {
      case 'text':
        return <p key={el.id} className="text-sm text-gray-300 my-2" {...el.props}>{el.props.content}</p>;
      case 'button':
        return (
          <button 
            key={el.id} 
            className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded text-sm transition"
            onClick={() => {
              // Note: Sending an EVENT back to the worker is outside the scope of this basic scaffold, 
              // but this is where we would postMessage({type:'EVENT', payload: {elementId: el.id}})
              console.log(`Plugin ${pluginId} button clicked: ${el.id}`);
            }}
          >
            {el.props.label}
          </button>
        );
      case 'input':
        return (
          <input 
            key={el.id}
            type={el.props.inputType || 'text'}
            placeholder={el.props.placeholder}
            className="w-full bg-gray-950 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 my-2"
          />
        );
      case 'list':
        return (
          <div key={el.id} className="flex flex-col gap-2 my-2">
            {el.children?.map(child => renderElement(child))}
          </div>
        );
      default:
        return <div key={el.id} className="text-red-500 text-xs">Unknown Element: {el.type}</div>;
    }
  };

  if (!uiSchema) return null;

  return (
    <div className="p-4 bg-gray-900 border border-gray-800 rounded-lg shadow">
      {renderElement(uiSchema)}
    </div>
  );
};
