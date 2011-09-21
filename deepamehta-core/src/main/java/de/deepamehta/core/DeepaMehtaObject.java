package de.deepamehta.core;

import de.deepamehta.core.model.CompositeValue;
import de.deepamehta.core.model.SimpleValue;
import de.deepamehta.core.service.Directives;

import java.util.List;
import java.util.Set;



public interface DeepaMehtaObject extends JSONEnabled {



    // === Model ===

    // --- ID ---

    long getId();

    // --- URI ---

    String getUri();

    void setUri(String uri);

    // --- Type URI ---

    String getTypeUri();

    void setTypeUri(String typeUri);

    // --- Simple Value ---

    SimpleValue getSimpleValue();

    void setSimpleValue(String value);
    void setSimpleValue(int value);
    void setSimpleValue(long value);
    void setSimpleValue(boolean value);
    void setSimpleValue(SimpleValue value);

    // --- Composite Value ---

    CompositeValue getCompositeValue();

    void setCompositeValue(CompositeValue comp);



    // === Traversal ===

    /**
     * Returns a child topic's value or <code>null</code> if the child topic doesn't exist.
     */
    SimpleValue getChildTopicValue(String assocDefUri);

    void setChildTopicValue(String assocDefUri, SimpleValue value);

    // --- Topic Retrieval ---

    ResultSet<RelatedTopic> getRelatedTopics(String assocTypeUri, int maxResultSize);

    /**
     * Retrieves and returns a related topic or <code>null</code> if no such topic extists.
     *
     * @param   assocTypeUri        may be null
     * @param   myRoleTypeUri       may be null
     * @param   othersRoleTypeUri   may be null
     * @param   othersTopicTypeUri  may be null
     */
    RelatedTopic getRelatedTopic(String assocTypeUri, String myRoleTypeUri, String othersRoleTypeUri,
                                 String othersTopicTypeUri, boolean fetchComposite, boolean fetchRelatingComposite);

    /**
     * @param   assocTypeUri        may be null
     * @param   myRoleTypeUri       may be null
     * @param   othersRoleTypeUri   may be null
     * @param   othersTopicTypeUri  may be null
     */
    ResultSet<RelatedTopic> getRelatedTopics(String assocTypeUri, String myRoleTypeUri, String othersRoleTypeUri,
                  String othersTopicTypeUri, boolean fetchComposite, boolean fetchRelatingComposite, int maxResultSize);

    /**
     * @param   assocTypeUris       may be null
     * @param   myRoleTypeUri       may be null
     * @param   othersRoleTypeUri   may be null
     * @param   othersTopicTypeUri  may be null
     */
    ResultSet<RelatedTopic> getRelatedTopics(List assocTypeUris, String myRoleTypeUri, String othersRoleTypeUri,
                  String othersTopicTypeUri, boolean fetchComposite, boolean fetchRelatingComposite, int maxResultSize);

     // --- Association Retrieval ---

     Set<Association> getAssociations();

     Set<Association> getAssociations(String myRoleTypeUri);



    // === Deletion ===

    /**
     * Deletes the DeepaMehta object in its entirety, that is
     * - the object itself (the <i>whole</i>)
     * - all sub-topics associated via "dm4.core.composition" (the <i>parts</i>), recusively
     * - all the remaining direct associations, e.g. "dm4.core.instantiation"
     */
    void delete(Directives directives);
}
