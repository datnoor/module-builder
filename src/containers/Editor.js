import React, { Component } from 'react'
import { push } from 'react-router-redux'
import { bindActionCreators } from 'redux'
import { connect } from 'react-redux'
import _ from 'lodash'
import Joyride from 'react-joyride'
import ReactTooltip from 'react-tooltip'

import StateEditor from '../components/editor/State';
import ModulePropertiesEditor from '../components/editor/ModuleProperties';
import ModuleGraph from '../components/graph/ModuleGraph';
import LoadModule from '../components/menu/LoadModule';
import Download from '../components/menu/Download';
import { extractStates } from '../transforms/Module';
import {cleanString } from '../utils/stringUtils';

import { findAvailableKey, createSafeKeyFromName } from '../utils/keys';
import { getTemplate } from '../templates/Templates';
import { BasicTutorial, EditTutorial } from '../templates/Tutorial';

import './Editor.css';
import '../../node_modules/react-joyride/lib/react-joyride-compiled.css'

import {selectNode,
        addNode,
        addStructure,
        addTransition,
        editNode,
        renameNode,
        copyNode,
        newModule,
        bulkLoadModules,
        showLoadModule,
        hideLoadModule,
        showDownload,
        hideDownload,
        changeStateType,
        editModuleName,
        editModuleRemarks} from '../actions/editor';

class Editor extends Component {

  constructor() {
    super();
    this.state = {
      joyride: {
        run: false,
        steps: BasicTutorial,
        stepIndex: 0
      }
    }
  }

  componentDidMount() {
    import("../data/modules").then(modules => {
      this.props.bulkLoadModules(modules.default);
    });
  }

  /*
    This is a recursive function to track the path that an edit action took through the Inspector
    It was written this way because there's multiple ways that one could get to, say, a Conditional Editor
    By keeping track of where it's been it means that the action can just look into the modules along the path
  */
  onChange  = (update, path=[]) => {
    if(typeof update !== 'object') {
      return (val) => this.onChange(val, [].concat(path, [update]))
    }
    this.props.editNode(update, path)
  }

  renameNode = (targetModuleKey, targetNode) => {
    return (newName) => {
      newName.name = cleanString(newName.name, {'.': '', '\\': '', '|': ''});
      this.props.renameNode(targetModuleKey, targetNode, newName);
    }
  }

  copyNode = (targetModuleKey, targetNode, takenKeys) => {
    return () => {
      let newNodeName = findAvailableKey(targetNode.name, takenKeys);
      this.props.copyNode(targetModuleKey, targetNode, newNodeName);
    }
  }

  changeStateType = (targetModuleKey, targetNode) => {
    return (newType) => {
      this.props.changeStateType(targetModuleKey, targetNode, newType);
    }
  }

  addTransition = (targetModuleKey, targetNode) => {
    return (transitionType) => {
      this.props.addTransition(targetModuleKey, targetNode, transitionType)
    }
  }

  newModule = (takenKeys) => {
    return (module = getTemplate('Module.Blank')) => {
      let key = findAvailableKey(createSafeKeyFromName(module.name), takenKeys);
      this.props.newModule(key, module);
      this.props.push('#' + key)
    }
  }

  addNode = (selectedModuleKey, takenKeys) => {
    return () => {
      let key = findAvailableKey(createSafeKeyFromName('New State'), takenKeys);
      let newState = {...getTemplate('State.Simple'), direct_transition: key };
      this.props.addNode(selectedModuleKey, key, newState);
    }
  }

  startTutorial = (steps) => {
    return () => {
      this.joyride.reset(true);
      this.setState({joyride: {run: true, steps}})
    }
  }
  renderAddButton = () => {
    if(this.props.module){
      return <button className='btn btn-secondary nav-action-button' data-tip='Add a state to this graph.' onClick={this.addNode(this.props.selectedModuleKey, Object.keys(this.props.module.states))}> Add State </button>
    }
    return <div/>
  }

  renderStateEditor = () => {
    if(this.props.module){
      return <StateEditor
        moduleName={this.props.module.name}
        helpFunction={this.startTutorial}
        renameNode={this.renameNode(this.props.selectedModuleKey, this.props.moduleState)}
        changeType={this.changeStateType(this.props.selectedModuleKey, this.props.moduleState)}
        copyNode={this.copyNode(this.props.selectedModuleKey, this.props.moduleState, Object.keys(this.props.module.states))}
        addTransition={this.addTransition(this.props.selectedModuleKey, this.props.moduleState)}
        state={this.props.moduleState}
        otherStates={this.props.moduleStates}
        onChange={this.onChange(this.props.selectedModuleKey)} />
    }
    return <div/>

  }

  renderDownload = () => {
    if(this.props.module){
      return <Download module={this.props.module}
        visible={this.props.downloadVisible}
        onHide={this.props.hideDownload}/>
    }
    return <div/>
  }

  renderModulePropertiesEditor = () => {
    if(this.props.module){
      return <ModulePropertiesEditor
              module={this.props.module}
              onNameChange={(name) => this.props.editModuleName(this.props.selectedModuleKey, name)}
              onRemarksChange={(remarks) => this.props.editModuleRemarks(this.props.selectedModuleKey, remarks)}/>
    }
    return <div/>
  }

  renderModuleGraph = () => {
    if(this.props.module){
      return <ModuleGraph
            module={this.props.module}
            onClick={this.props.selectNode}
            selectedState={this.props.moduleState}/>
    }
    return <div/>
  }

  render() {
    return (
      <div className='Editor'>
        <nav className="navbar fixed-top navbar-expand-lg navbar-light bg-light">
          <a className="navbar-brand" href="#">Synthea Module Builder</a>
          <button className="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarNavAltMarkup" aria-controls="navbarNavAltMarkup" aria-expanded="false" aria-label="Toggle navigation">
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="navbarNavAltMarkup">
            <div className="navbar-nav">
              <button className="btn btn-link nav-item nav-link" onClick={this.newModule(Object.keys(this.props.modules)).bind(this, undefined)}>New Module</button>
              <button className="btn btn-link nav-item nav-link" onClick={this.props.showLoadModule}>Load Module</button>
              <button className="btn btn-link nav-item nav-link" onClick={this.props.showDownload}>Download</button>
              {this.renderAddButton()}
              {/*<button className='btn btn-secondary nav-action-button' onClick={() => this.props.addStructure(this.props.selectedModuleKey, 'CheckYearly')}> Add Structure </button> */}
              <button className='btn btn-secondary nav-action-button disabled' data-tip='Structures are not yet available' onClick={() => null}> Add Structure </button>
              <button className='btn btn-secondary nav-action-button' onClick={this.startTutorial(BasicTutorial)}> Help </button>
            </div>
          </div>
        </nav>

        <LoadModule modules={this.props.modules}
          visible={this.props.loadModuleVisible}
          onHide={this.props.hideLoadModule}
          push={this.props.push}
          newModule={this.newModule(Object.keys(this.props.modules))}
          />

        {this.renderDownload()}

        <div className='Editor-main'>

          <div className='Editor-panel'>

            {this.renderModulePropertiesEditor()}

            {this.renderStateEditor()}

           </div>

          {this.renderModuleGraph()}

        </div>

        <Joyride
          ref={c => (this.joyride = c)}
          showOverlay={true}
          showSkipButton={true}
          showStepsProgress={false}
          type={'continuous'}
          steps={this.state.joyride.steps}
          run={this.state.joyride.run}
          autoStart={true}
          debug={false}
          allowClicksThruHole={false}
          keyboardNavigation={true}
        />

        <ReactTooltip
          className='react-tooltip-customized'
          effect='solid'
          />

      </div>
    )
  }
}

const mapStateToProps = state => {

  let selectedModuleKey = state.editor.selectedModuleKey;

  if(!state.modules[selectedModuleKey]){
    selectedModuleKey = Object.keys(state.modules)[0];
  }

  let module = state.modules[selectedModuleKey];
  let moduleStates = extractStates(module);
  let moduleState =  moduleStates.find(s => (s.name === state.editor.selectedStateKey))

  return {
    module,
    modules: state.modules,
    selectedModuleKey,
    moduleState,
    moduleStates,
    selectedStateKey: state.editor.selectedStateKey,
    loadModuleVisible: state.editor.loadModuleVisible,
    downloadVisible: state.editor.downloadVisible,
  }
}

const mapDispatchToProps = dispatch => bindActionCreators({
  selectNode,
  addNode,
  addStructure,
  addTransition,
  editNode,
  renameNode,
  copyNode,
  changeStateType,
  newModule,
  bulkLoadModules,
  showLoadModule,
  hideLoadModule,
  showDownload,
  hideDownload,
  editModuleName,
  editModuleRemarks,
  push
}, dispatch)

export default connect(mapStateToProps, mapDispatchToProps)(Editor);
