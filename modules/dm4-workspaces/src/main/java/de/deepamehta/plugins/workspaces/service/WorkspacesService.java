package de.deepamehta.plugins.workspaces.service;

import de.deepamehta.core.DeepaMehtaObject;
import de.deepamehta.core.RelatedTopic;
import de.deepamehta.core.Topic;
import de.deepamehta.core.Type;
import de.deepamehta.core.service.PluginService;
import de.deepamehta.core.service.ResultList;
import de.deepamehta.core.service.accesscontrol.SharingMode;



public interface WorkspacesService extends PluginService {

    static final String DEEPAMEHTA_WORKSPACE_NAME = "DeepaMehta";
    static final String DEEPAMEHTA_WORKSPACE_URI = "de.workspaces.deepamehta";  // ### FIXME: "de." -> "dm4."
    static final SharingMode DEEPAMEHTA_WORKSPACE_SHARING_MODE = SharingMode.PUBLIC;

    /**
     * Returns a workspace by URI.
     * If no workspace exists for the given URI a runtime exception is thrown.
     *
     * @return  The workspace (a topic of type "Workspace").
     */
    Topic getWorkspace(String uri);

    /**
     * Returns all topics of a given type that are assigned to a given workspace.
     */
    ResultList<RelatedTopic> getAssignedTopics(long workspaceId, String typeUri);

    /**
     * Returns the workspace a topic or association is assigned to.
     *
     * @param   id      a topic ID, or an association ID
     *
     * @return  The assigned workspace (a topic of type "Workspace"),
     *          or <code>null</code> if no workspace is assigned.
     */
    Topic getAssignedWorkspace(long objectId);

    /**
     * Checks weather the specified topic is assigned to the specified workspace
     */
    boolean isAssignedToWorkspace(Topic topic, long workspaceId);

    // ---

    /**
     * Assigns the specified object to a workspace.
     */
    void assignToWorkspace(DeepaMehtaObject object, long workspaceId);

    /**
     * Assigns the specified type and all its view configuration topics to a workspace.
     */
    void assignTypeToWorkspace(Type type, long workspaceId);

    // ---

    /**
     * @param   uri     may be null
     */
    Topic createWorkspace(String name, String uri, SharingMode sharingMode);
}
